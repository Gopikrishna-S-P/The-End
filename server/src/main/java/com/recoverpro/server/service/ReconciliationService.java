package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.BankStatementRowRequest;
import com.recoverpro.server.dto.request.IngestStatementRequest;
import com.recoverpro.server.dto.response.BankStatementRowResponse;
import com.recoverpro.server.dto.response.ReconciliationRunResponse;
import com.recoverpro.server.entity.BankStatementRow;
import com.recoverpro.server.entity.PaymentTransaction;
import com.recoverpro.server.entity.ReconciliationRun;
import com.recoverpro.server.enums.PaymentIntentStatus;
import com.recoverpro.server.enums.PaymentTransactionState;
import com.recoverpro.server.enums.ReconciliationOutcome;
import com.recoverpro.server.repository.BankStatementRowRepository;
import com.recoverpro.server.repository.PaymentIntentRepository;
import com.recoverpro.server.repository.PaymentTransactionRepository;
import com.recoverpro.server.repository.ReconciliationRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Reconciliation engine (design-doc §5.5).
 *
 * v1: synchronous batch -- ingest rows, match each against
 * PaymentTransactions by UTR (then by provider_txn_id as fallback),
 * record outcome, and roll up counters on the ReconciliationRun.
 * On MATCHED, the PaymentTransaction is moved CAPTURED -> RECONCILED
 * (PaymentIntent is also flipped if all txns reconciled).
 *
 * Three-way Collection match (txn -> Collection -> bank row) is not yet
 * wired because Collection has no payment_transaction_id column. That
 * cross-link lands when the Collection module is migrated to use
 * PaymentIntents (separate turn).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ReconciliationService {

    private final ReconciliationRunRepository runRepository;
    private final BankStatementRowRepository rowRepository;
    private final PaymentTransactionRepository txnRepository;
    private final PaymentIntentRepository intentRepository;

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ReconciliationRunResponse ingestAndMatch(IngestStatementRequest request, UUID actingUserId) {
        if (request.getStatementHash() != null) {
            Optional<ReconciliationRun> existing = runRepository.findByStatementHash(request.getStatementHash());
            if (existing.isPresent()) {
                log.info("Idempotent reconciliation replay: hash={}, runId={}",
                        request.getStatementHash(), existing.get().getId());
                return toResponse(existing.get());
            }
        }

        // Reject statements whose asOfDate is more than 7 days before the newest already-ingested date.
        runRepository.findMaxAsOfDateByOrganizationId(request.getOrganizationId()).ifPresent(maxDate -> {
            if (request.getAsOfDate().isBefore(maxDate.minusDays(7))) {
                throw new BusinessException(
                        "Statement asOfDate " + request.getAsOfDate() + " is more than 7 days older than"
                        + " the latest ingested date " + maxDate + ". Out-of-order ingest rejected.");
            }
        });

        ReconciliationRun run = ReconciliationRun.builder()
                .organizationId(request.getOrganizationId())
                .source(request.getSource())
                .asOfDate(request.getAsOfDate())
                .statementHash(request.getStatementHash())
                .startedByUserId(actingUserId)
                .build();
        run = runRepository.save(run);
        log.info("Reconciliation run started: id={}, source={}, asOf={}, rows={}",
                run.getId(), run.getSource(), run.getAsOfDate(), request.getRows().size());

        List<BankStatementRow> rows = new ArrayList<>(request.getRows().size());
        for (BankStatementRowRequest in : request.getRows()) {
            rows.add(BankStatementRow.builder()
                    .runId(run.getId())
                    .utr(in.getUtr())
                    .txnRef(in.getTxnRef())
                    .amount(in.getAmount())
                    .valueDate(in.getValueDate())
                    .narration(in.getNarration())
                    .sourceRowId(in.getSourceRowId())
                    .outcome(ReconciliationOutcome.UNMATCHED)
                    .build());
        }
        rows = rowRepository.saveAll(rows);
        run.setRowsIngested(rows.size());

        for (BankStatementRow row : rows) {
            applyOutcome(row, run);
            rowRepository.save(row);
        }
        return toResponse(runRepository.save(run));
    }

    @Transactional(readOnly = true)
    public ReconciliationRunResponse getRun(UUID id) {
        return toResponse(runRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reconciliation run not found: " + id)));
    }

    @Transactional(readOnly = true)
    public Page<ReconciliationRunResponse> listRuns(UUID organizationId, Pageable pageable) {
        return runRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId, pageable)
                .map(this::toResponse);
    }

    /**
     * End-of-day summary file -- materialises today's reconciliation runs
     * into a CSV under {@code app.report.storage-path/reconciliation/}
     * (design-doc §5.5). Returns the absolute path written, or null when
     * no runs happened today (no file emitted).
     *
     * Called by {@link com.recoverpro.server.scheduler.ReconciliationEodScheduler}
     * once per business day; a manual operator endpoint can also trigger
     * via {@link #emitEndOfDayReport(Instant, String)}.
     */
    public String emitEndOfDayReport(Instant asOf, String reportRoot) {
        ZoneId ist = ZoneId.of("Asia/Kolkata");
        LocalDate day = asOf.atZone(ist).toLocalDate();
        Instant start = day.atStartOfDay(ist).toInstant();
        Instant end = day.plusDays(1).atStartOfDay(ist).toInstant();

        var runs = runRepository.findByCreatedAtBetween(start, end);
        if (runs.isEmpty()) return null;

        java.nio.file.Path target = java.nio.file.Paths.get(reportRoot, "reconciliation",
                day.toString() + ".csv");
        try {
            java.nio.file.Files.createDirectories(target.getParent());
            try (java.io.BufferedWriter w = java.nio.file.Files.newBufferedWriter(
                    target, java.nio.charset.StandardCharsets.UTF_8)) {
                w.write("run_id,organization_id,source,as_of_date,rows_ingested,matched,unmatched,amount_diff,duplicates,exceptions,created_at");
                w.newLine();
                for (var r : runs) {
                    w.write(String.join(",",
                            String.valueOf(r.getId()),
                            String.valueOf(r.getOrganizationId()),
                            csvSafe(r.getSource()),
                            String.valueOf(r.getAsOfDate()),
                            String.valueOf(r.getRowsIngested()),
                            String.valueOf(r.getMatched()),
                            String.valueOf(r.getUnmatched()),
                            String.valueOf(r.getAmountDiff()),
                            String.valueOf(r.getDuplicates()),
                            String.valueOf(r.getExceptions()),
                            String.valueOf(r.getCreatedAt())));
                    w.newLine();
                }
            }
            log.info("Reconciliation EOD written: {} ({} runs)", target, runs.size());
            return target.toString();
        } catch (java.io.IOException e) {
            log.error("Reconciliation EOD failed", e);
            return null;
        }
    }

    private static String csvSafe(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    /**
     * Sweep recent UNMATCHED rows and re-apply match logic. Useful when a
     * matching {@link PaymentTransaction} arrives after the original
     * ingest (provider DLR delayed past the ingest cutoff). Called by
     * the {@code ReconciliationScheduler} every business hour.
     *
     * Returns a count of rows whose outcome flipped to MATCHED.
     */
    public int retryUnmatched() {
        int flipped = 0;
        List<BankStatementRow> stale = rowRepository.findRecentlyUnmatched();
        for (BankStatementRow row : stale) {
            ReconciliationRun run = runRepository.findById(row.getRunId()).orElse(null);
            if (run == null) continue;
            ReconciliationOutcome before = row.getOutcome();
            applyOutcome(row, run);
            if (row.getOutcome() == ReconciliationOutcome.MATCHED && before != ReconciliationOutcome.MATCHED) {
                // Adjust run counters: row was previously counted as UNMATCHED.
                run.setUnmatched(Math.max(0, run.getUnmatched() - 1));
                runRepository.save(run);
                rowRepository.save(row);
                flipped++;
            }
        }
        return flipped;
    }

    @Transactional(readOnly = true)
    public Page<BankStatementRowResponse> listRows(
            UUID runId, ReconciliationOutcome outcome, Pageable pageable) {
        Page<BankStatementRow> page = (outcome == null)
                ? rowRepository.findByRunId(runId, pageable)
                : rowRepository.findByRunIdAndOutcome(runId, outcome, pageable);
        return page.map(this::toRowResponse);
    }

    // -------- match logic --------

    private void applyOutcome(BankStatementRow row, ReconciliationRun run) {
        if ((row.getUtr() == null || row.getUtr().isBlank())
                && (row.getTxnRef() == null || row.getTxnRef().isBlank())) {
            row.setOutcome(ReconciliationOutcome.EXCEPTION);
            row.setMatchNotes("missing both utr and txn_ref -- cannot match");
            run.setExceptions(run.getExceptions() + 1);
            return;
        }

        PaymentTransaction candidate = null;
        if (row.getUtr() != null && !row.getUtr().isBlank()) {
            candidate = txnRepository.findByUtr(row.getUtr()).orElse(null);
        }
        if (candidate == null && row.getTxnRef() != null && !row.getTxnRef().isBlank()) {
            candidate = txnRepository.findByProviderTxnId(row.getTxnRef()).orElse(null);
        }

        if (candidate == null) {
            row.setOutcome(ReconciliationOutcome.UNMATCHED);
            run.setUnmatched(run.getUnmatched() + 1);
            return;
        }

        // Idempotency: don't double-reconcile.
        if (candidate.getState() == PaymentTransactionState.REVERSED
                || candidate.getState() == PaymentTransactionState.REFUNDED) {
            row.setOutcome(ReconciliationOutcome.DUPLICATE);
            row.setMatchedPaymentTxnId(candidate.getId());
            row.setMatchNotes("payment txn already in terminal state " + candidate.getState());
            run.setDuplicates(run.getDuplicates() + 1);
            return;
        }

        if (amountsEqual(candidate.getAmount(), row.getAmount())) {
            row.setOutcome(ReconciliationOutcome.MATCHED);
            row.setMatchedPaymentTxnId(candidate.getId());
            run.setMatched(run.getMatched() + 1);
            // Move txn forward; intent flips when all its txns are reconciled.
            if (candidate.getState() != PaymentTransactionState.CAPTURED) {
                candidate.setState(PaymentTransactionState.CAPTURED);
                candidate.setCapturedAt(Instant.now());
            }
            txnRepository.save(candidate);
            promoteIntentIfFullyReconciled(candidate.getIntentId());
        } else {
            row.setOutcome(ReconciliationOutcome.AMOUNT_DIFF);
            row.setMatchedPaymentTxnId(candidate.getId());
            row.setMatchNotes("expected " + candidate.getAmount() + ", file shows " + row.getAmount());
            run.setAmountDiff(run.getAmountDiff() + 1);
        }
    }

    private void promoteIntentIfFullyReconciled(UUID intentId) {
        var intent = intentRepository.findById(intentId).orElse(null);
        if (intent == null) return;
        if (intent.getStatus() == PaymentIntentStatus.RECONCILED
                || intent.getStatus() == PaymentIntentStatus.REFUNDED) return;
        var txns = txnRepository.findByIntentIdOrderByCreatedAtDesc(intentId);
        if (txns.isEmpty()) return;
        BigDecimal captured = txns.stream()
                .filter(t -> t.getState() == PaymentTransactionState.CAPTURED)
                .map(PaymentTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (captured.compareTo(intent.getAmount()) >= 0) {
            intent.setStatus(PaymentIntentStatus.RECONCILED);
            intentRepository.save(intent);
            log.info("Intent {} promoted to RECONCILED (captured={} >= intent.amount={})",
                    intentId, captured, intent.getAmount());
        }
    }

    private static boolean amountsEqual(BigDecimal a, BigDecimal b) {
        if (a == null || b == null) return false;
        return a.compareTo(b) == 0;
    }

    private ReconciliationRunResponse toResponse(ReconciliationRun r) {
        return ReconciliationRunResponse.builder()
                .id(r.getId())
                .organizationId(r.getOrganizationId())
                .source(r.getSource())
                .asOfDate(r.getAsOfDate())
                .rowsIngested(r.getRowsIngested())
                .matched(r.getMatched())
                .unmatched(r.getUnmatched())
                .amountDiff(r.getAmountDiff())
                .duplicates(r.getDuplicates())
                .exceptions(r.getExceptions())
                .reportJobId(r.getReportJobId())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private BankStatementRowResponse toRowResponse(BankStatementRow b) {
        return BankStatementRowResponse.builder()
                .id(b.getId())
                .runId(b.getRunId())
                .utr(b.getUtr())
                .txnRef(b.getTxnRef())
                .amount(b.getAmount())
                .currency(b.getCurrency())
                .valueDate(b.getValueDate())
                .narration(b.getNarration())
                .sourceRowId(b.getSourceRowId())
                .outcome(b.getOutcome())
                .matchedPaymentTxnId(b.getMatchedPaymentTxnId())
                .matchNotes(b.getMatchNotes())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
