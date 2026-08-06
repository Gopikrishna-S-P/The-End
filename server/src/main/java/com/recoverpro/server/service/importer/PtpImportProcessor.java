package com.recoverpro.server.service.importer;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.enums.UploadType;
import com.recoverpro.server.repository.PtpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Imports promises-to-pay that were made before the org onboarded.
 *
 * <p>The delicate part is the nightly sweep in {@code PtpServiceImpl.autoMarkExpiredPtpsAsBroken()},
 * which picks up every PENDING record whose promised date has passed, flips it to BROKEN, writes
 * history attributed to the scheduler, and calls {@code PtpEscalationService.onPtpBroken(...)}.
 * A naive backfill would therefore fire live escalation for promises that were resolved years ago.
 *
 * <p>So the rule here is: a promise whose date has already passed is imported in a terminal
 * state, never PENDING. Only a promise still genuinely in the future stays PENDING, which lets
 * it resume normal reminders and escalation from the moment it is imported.
 *
 * <p>The morning reminder job needs no special handling - it matches {@code promisedDate = tomorrow}
 * exactly, so a past-dated row can never match it. {@code reminderSent} is still stamped on
 * past-dated rows so the record reads honestly rather than as "reminder still pending".
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PtpImportProcessor implements EntityImportProcessor<PtpRecord> {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private static final String IMPORTED_UNRESOLVED_REASON =
            "Imported from historical data: promised date had already passed with no recorded outcome.";

    // "amount" is deliberately NOT an alias here. Normalised, "collected_amount" would have
    // matched it under the old substring rule and quietly filed the collected figure as the
    // promised one. A PTP file must name its promised amount explicitly.
    private static final ImportFieldSpec LOAN_NUMBER = ImportFieldSpec.required(
            "loan_number", "Loan number", "LN-000123", "loan number", "loannumber", "loan_no");
    private static final ImportFieldSpec AGENT_EMAIL = ImportFieldSpec.required(
            "agent_email", "Agent email", "agent@example.com", "agent email", "agentemail", "email");
    private static final ImportFieldSpec PROMISED_DATE = ImportFieldSpec.required(
            "promised_date", "Promised date", "15/03/2024", "promise date", "ptp_date", "due_date");
    private static final ImportFieldSpec PROMISED_AMOUNT = ImportFieldSpec.required(
            "promised_amount", "Promised amount", "5000", "promise amount", "ptp_amount");
    private static final ImportFieldSpec STATUS = ImportFieldSpec.optional(
            "status", "Status", "FULFILLED", "ptp_status");
    private static final ImportFieldSpec COLLECTED_AMOUNT = ImportFieldSpec.optional(
            "collected_amount", "Collected amount", "5000", "amount_collected", "collected");
    private static final ImportFieldSpec CONTACT_NOTES = ImportFieldSpec.optional(
            "contact_notes", "Contact notes", "Promised over phone", "notes", "remarks");
    private static final ImportFieldSpec REASON = ImportFieldSpec.optional(
            "broken_reason", "Reason", "", "reason", "cancellation_reason");

    private final PtpRepository ptpRepository;

    @Override
    public UploadType supportedType() {
        return UploadType.PTP;
    }

    @Override
    public List<ImportFieldSpec> fieldSpecs() {
        return List.of(LOAN_NUMBER, AGENT_EMAIL, PROMISED_DATE, PROMISED_AMOUNT,
                STATUS, COLLECTED_AMOUNT, CONTACT_NOTES, REASON);
    }

    @Override
    public PtpRecord mapRow(Map<String, String> row, int rowNumber, ImportContext context) {
        String loanNumber = ImportValues.findRequired(row, LOAN_NUMBER);

        Allocation allocation = context.getAllocationsByLoanNumber().get(loanNumber);
        if (allocation == null) {
            throw new RowValidationException("loan_number",
                    "Loan number '" + loanNumber + "' not found in this organization", loanNumber);
        }

        User agent = resolveAgent(row, context);

        LocalDate promisedDate = ImportValues.parseRequiredDate(
                ImportValues.findRequired(row, PROMISED_DATE), "promised_date", "Promised date");

        BigDecimal promisedAmount = ImportValues.parseDecimal(ImportValues.findRequired(row, PROMISED_AMOUNT));
        if (promisedAmount == null || promisedAmount.signum() <= 0) {
            throw new RowValidationException("promised_amount", "Promised amount must be a positive number",
                    ImportValues.find(row, PROMISED_AMOUNT.allNames()));
        }

        BigDecimal collectedAmount = ImportValues.parseDecimal(
                ImportValues.find(row, COLLECTED_AMOUNT.allNames()));
        if (collectedAmount == null) collectedAmount = BigDecimal.ZERO;

        boolean expired = promisedDate.isBefore(LocalDate.now());
        PtpStatus status = resolveStatus(row, expired);
        Instant promisedInstant = promisedDate.atStartOfDay(IST).toInstant();

        PtpRecord ptp = PtpRecord.builder()
                .allocationId(allocation.getId())
                .loanNumber(allocation.getLoanNumber())
                .agentId(agent.getId())
                .agentName(displayName(agent))
                .borrowerName(allocation.getBorrowerName())
                .promisedDate(promisedDate)
                .promisedAmount(promisedAmount)
                .collectedAmount(collectedAmount)
                .status(status)
                .contactNotes(blankToNull(ImportValues.find(row, CONTACT_NOTES.allNames())))
                .createdBy(context.getImportedByUserId())
                .updatedBy(context.getImportedByUserId())
                // Nothing is owed a reminder for a date already gone; leaving this false on a
                // past-dated row would misrepresent it as still awaiting outreach.
                .reminderSent(expired)
                .reminderSentAt(expired ? promisedInstant : null)
                .build();

        if (status == PtpStatus.BROKEN) {
            ptp.setBrokenAt(promisedInstant);
            String reasonFromFile = blankToNull(ImportValues.find(row, REASON.allNames()));
            ptp.setBrokenReason(reasonFromFile != null ? reasonFromFile : IMPORTED_UNRESOLVED_REASON);
        } else if (status == PtpStatus.FULFILLED || status == PtpStatus.PARTIALLY_FULFILLED) {
            ptp.setFulfilledAt(promisedInstant);
        } else if (status == PtpStatus.CANCELLED) {
            ptp.setCancellationReason(blankToNull(ImportValues.find(row, REASON.allNames())));
        }

        return ptp;
    }

    @Override
    public void persistBatch(List<PtpRecord> batch, ImportContext context) {
        Set<String> existing = existingKeys(batch);

        List<PtpRecord> fresh = existing.isEmpty()
                ? batch
                : batch.stream().filter(p -> !existing.contains(naturalKey(p))).collect(Collectors.toList());

        if (fresh.size() < batch.size()) {
            log.info("PTP import: skipped {} row(s) already present from an earlier upload",
                    batch.size() - fresh.size());
        }
        if (!fresh.isEmpty()) {
            ptpRepository.saveAll(fresh);
        }
    }

    /**
     * The file's own status wins, but a PENDING promise whose date has passed is coerced to
     * BROKEN. Left PENDING it would be swept tonight, firing escalation for a stale promise.
     */
    private PtpStatus resolveStatus(Map<String, String> row, boolean expired) {
        PtpStatus fromFile = ImportValues.parseEnum(PtpStatus.class,
                ImportValues.find(row, STATUS.allNames()));

        if (fromFile == null) {
            return expired ? PtpStatus.BROKEN : PtpStatus.PENDING;
        }
        if (fromFile == PtpStatus.PENDING && expired) {
            return PtpStatus.BROKEN;
        }
        return fromFile;
    }

    /** PTPs carry a NOT NULL agent, so unlike collections the email is mandatory here. */
    private User resolveAgent(Map<String, String> row, ImportContext context) {
        String email = ImportValues.findRequired(row, AGENT_EMAIL);

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

    private Set<String> existingKeys(List<PtpRecord> batch) {
        Set<java.util.UUID> allocationIds = batch.stream()
                .map(PtpRecord::getAllocationId).collect(Collectors.toSet());
        Set<LocalDate> dates = batch.stream()
                .map(PtpRecord::getPromisedDate).collect(Collectors.toSet());

        if (allocationIds.isEmpty() || dates.isEmpty()) return Set.of();

        Set<String> keys = new HashSet<>();
        for (PtpRecord existing : ptpRepository
                .findByAllocationIdInAndPromisedDateInAndIsDeletedFalse(allocationIds, dates)) {
            keys.add(naturalKey(existing));
        }
        return keys;
    }

    /** A borrower can promise more than once on the same loan, so the amount is part of identity. */
    private static String naturalKey(PtpRecord ptp) {
        return ptp.getAllocationId() + "|" + ptp.getPromisedDate() + "|"
                + ptp.getPromisedAmount().stripTrailingZeros().toPlainString();
    }

    private static String displayName(User user) {
        String first = user.getFirstName() != null ? user.getFirstName() : "";
        String last = user.getLastName() != null ? user.getLastName() : "";
        String full = (first + " " + last).trim();
        return full.isEmpty() ? user.getEmail() : full;
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
