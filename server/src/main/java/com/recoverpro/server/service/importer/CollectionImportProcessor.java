package com.recoverpro.server.service.importer;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.PaymentMode;
import com.recoverpro.server.enums.UploadType;
import com.recoverpro.server.repository.CollectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Imports collections that were already taken in the field, typically from whatever system
 * the org ran before onboarding.
 *
 * <p>Two things separate this from a live collection submission: the row never enters the
 * approval queue (a payment from 2023 has nothing to approve), and re-uploading an overlapping
 * file is a no-op because the idempotency key is derived from the payment's own identity
 * rather than generated per request.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CollectionImportProcessor implements EntityImportProcessor<Collection> {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private static final ImportFieldSpec LOAN_NUMBER = ImportFieldSpec.required(
            "loan_number", "Loan number", "LN-000123", "loan number", "loannumber", "loan_no");
    private static final ImportFieldSpec COLLECTION_DATE = ImportFieldSpec.required(
            "collection_date", "Collection date", "15/03/2024", "collection date", "payment_date");
    private static final ImportFieldSpec AMOUNT = ImportFieldSpec.required(
            "amount", "Amount", "5000", "amount_collected", "collected_amount");
    private static final ImportFieldSpec PAYMENT_MODE = ImportFieldSpec.required(
            "payment_mode", "Payment mode", "CASH", "payment mode", "mode", "payment_method");
    private static final ImportFieldSpec AGENT_EMAIL = ImportFieldSpec.optional(
            "agent_email", "Agent email", "agent@example.com", "agent email", "agentemail", "email");
    private static final ImportFieldSpec STATUS = ImportFieldSpec.optional(
            "status", "Status", "APPROVED", "collection_status");
    private static final ImportFieldSpec RECEIPT_NUMBER = ImportFieldSpec.optional(
            "receipt_number", "Receipt number", "", "receipt no", "receipt");
    private static final ImportFieldSpec CHEQUE_NUMBER = ImportFieldSpec.optional(
            "cheque_number", "Cheque number", "", "cheque no");
    private static final ImportFieldSpec CHEQUE_DATE = ImportFieldSpec.optional(
            "cheque_date", "Cheque date", "");
    private static final ImportFieldSpec BANK_NAME = ImportFieldSpec.optional(
            "bank_name", "Bank name", "", "bank");
    private static final ImportFieldSpec UPI_REFERENCE = ImportFieldSpec.optional(
            "upi_reference_id", "UPI reference", "", "upi reference", "upi_ref");
    private static final ImportFieldSpec TXN_REFERENCE = ImportFieldSpec.optional(
            "transaction_reference_id", "Transaction reference", "", "transaction reference", "txn_ref");
    private static final ImportFieldSpec NOTES = ImportFieldSpec.optional(
            "notes", "Notes", "", "remarks", "comment");

    private final CollectionRepository collectionRepository;

    @Override
    public UploadType supportedType() {
        return UploadType.COLLECTION;
    }

    @Override
    public List<ImportFieldSpec> fieldSpecs() {
        return List.of(LOAN_NUMBER, COLLECTION_DATE, AMOUNT, PAYMENT_MODE, AGENT_EMAIL, STATUS,
                RECEIPT_NUMBER, CHEQUE_NUMBER, CHEQUE_DATE, BANK_NAME, UPI_REFERENCE, TXN_REFERENCE, NOTES);
    }

    @Override
    public Collection mapRow(Map<String, String> row, int rowNumber, ImportContext context) {
        String loanNumber = ImportValues.findRequired(row, LOAN_NUMBER);

        Allocation allocation = context.getAllocationsByLoanNumber().get(loanNumber);
        if (allocation == null) {
            throw new RowValidationException("loan_number",
                    "Loan number '" + loanNumber + "' not found in this organization", loanNumber);
        }

        LocalDate collectionDate = ImportValues.parseRequiredDate(
                ImportValues.findRequired(row, COLLECTION_DATE), "collection_date", "Collection date");

        BigDecimal amount = ImportValues.parseDecimal(ImportValues.findRequired(row, AMOUNT));
        if (amount == null || amount.signum() <= 0) {
            throw new RowValidationException("amount", "Amount must be a positive number",
                    ImportValues.find(row, AMOUNT.allNames()));
        }

        // Money rows are not worth guessing at: an unreadable mode would silently misfile
        // cash as UPI in the ledger, so the row fails loudly instead.
        String rawMode = ImportValues.find(row, PAYMENT_MODE.allNames());
        PaymentMode paymentMode = ImportValues.parseEnum(PaymentMode.class, rawMode);
        if (paymentMode == null) {
            throw new RowValidationException("payment_mode",
                    "Payment mode is required and must be one of CASH, UPI, CHEQUE, NEFT, RTGS", rawMode);
        }

        User agent = resolveAgent(row, context);
        CollectionStatus status = resolveStatus(row, context);
        Instant collectedAt = collectionDate.atStartOfDay(IST).toInstant();

        Collection collection = Collection.builder()
                .allocationId(allocation.getId())
                .loanNumber(allocation.getLoanNumber())
                .organizationId(context.organizationId())
                .submittedBy(agent != null ? agent.getId() : context.getImportedByUserId())
                .amount(amount)
                .paymentMode(paymentMode)
                .status(status)
                .collectionDate(collectionDate)
                .receiptNumber(blankToNull(ImportValues.find(row, RECEIPT_NUMBER.allNames())))
                .chequeNumber(blankToNull(ImportValues.find(row, CHEQUE_NUMBER.allNames())))
                .chequeDate(ImportValues.parseDate(ImportValues.find(row, CHEQUE_DATE.allNames())))
                .bankName(blankToNull(ImportValues.find(row, BANK_NAME.allNames())))
                .upiReferenceId(blankToNull(ImportValues.find(row, UPI_REFERENCE.allNames())))
                .transactionReferenceId(blankToNull(ImportValues.find(row, TXN_REFERENCE.allNames())))
                .notes(blankToNull(ImportValues.find(row, NOTES.allNames())))
                .idempotencyKey(idempotencyKey(context.organizationId().toString(),
                        allocation.getLoanNumber(), collectionDate, amount, paymentMode))
                .build();

        // Backdate the approval trail rather than stamping "now", so ledger and audit
        // reporting for the historical period stays truthful.
        if (status == CollectionStatus.APPROVED || status == CollectionStatus.DEPOSITED) {
            collection.setApprovedBy(context.getImportedByUserId());
            collection.setApprovedAt(collectedAt);
        }
        if (status == CollectionStatus.DEPOSITED) {
            collection.setDepositedBy(context.getImportedByUserId());
            collection.setDepositedAt(collectedAt);
        }

        return collection;
    }

    @Override
    public void persistBatch(List<Collection> batch, ImportContext context) {
        // One lookup per batch rather than per row. Without this, re-uploading a file that
        // overlaps a previous one would hit the unique index and roll back the whole batch.
        Set<String> keys = batch.stream().map(Collection::getIdempotencyKey).collect(Collectors.toSet());
        Set<String> alreadyImported = collectionRepository.findExistingIdempotencyKeys(keys);

        List<Collection> fresh = alreadyImported.isEmpty()
                ? batch
                : batch.stream()
                        .filter(c -> !alreadyImported.contains(c.getIdempotencyKey()))
                        .collect(Collectors.toList());

        if (fresh.size() < batch.size()) {
            log.info("Collection import: skipped {} row(s) already present from an earlier upload",
                    batch.size() - fresh.size());
        }
        if (!fresh.isEmpty()) {
            collectionRepository.saveAll(fresh);
        }
    }

    private User resolveAgent(Map<String, String> row, ImportContext context) {
        String email = ImportValues.find(row, AGENT_EMAIL.allNames());
        if (email == null || email.isBlank()) return null;

        User agent = context.getUsersByEmail().get(email.trim().toLowerCase());
        if (agent == null) {
            throw new RowValidationException("agent_email", "No user found with email '" + email + "'", email);
        }
        if (!context.organizationId().equals(agent.getOrganizationId())) {
            throw new RowValidationException("agent_email",
                    "Agent '" + email + "' does not belong to this organization", email);
        }
        return agent;
    }

    /**
     * A backfilled payment has already been through whatever approval the old system had, so
     * defaulting to PENDING_APPROVAL would dump thousands of settled payments into the
     * approval queue. The file's own status wins when it carries one.
     */
    private CollectionStatus resolveStatus(Map<String, String> row, ImportContext context) {
        CollectionStatus fromFile = ImportValues.parseEnum(CollectionStatus.class,
                ImportValues.find(row, STATUS.allNames()));
        if (fromFile != null) return fromFile;
        return context.isHistoricalImport() ? CollectionStatus.APPROVED : CollectionStatus.PENDING_APPROVAL;
    }

    /**
     * Deterministic from the payment's own identity, so the same real-world collection
     * produces the same key on every upload and the unique index does the deduping.
     */
    private static String idempotencyKey(String organizationId, String loanNumber, LocalDate date,
                                         BigDecimal amount, PaymentMode mode) {
        String seed = String.join("|", "import", organizationId, loanNumber,
                date.toString(), amount.stripTrailingZeros().toPlainString(), mode.name());
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(seed.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
