package com.recoverpro.server.service.importer;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.VisitLog;
import com.recoverpro.server.enums.ApprovalStatus;
import com.recoverpro.server.enums.Contactability;
import com.recoverpro.server.enums.Disp;
import com.recoverpro.server.enums.UploadType;
import com.recoverpro.server.enums.VisitStatus;
import com.recoverpro.server.repository.VisitLogRepository;
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
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Imports field visits that already happened.
 *
 * <p>Mirrors the mapping VisitImportServiceImpl established for the synchronous modal, but runs
 * through the async pipeline so a large backfill gets per-row error reporting, dedup and progress
 * instead of one long request. Visits carry no GPS from a historical export, hence the
 * GPS_UNAVAILABLE marker rather than pretending to coordinates the org never captured.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VisitImportProcessor implements EntityImportProcessor<VisitLog> {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private static final ImportFieldSpec LOAN_NUMBER = ImportFieldSpec.required(
            "loan_number", "Loan number", "LN-000123", "loan number", "loannumber", "loan_no");
    private static final ImportFieldSpec AGENT_EMAIL = ImportFieldSpec.required(
            "agent_email", "Agent email", "agent@example.com", "agent email", "agentemail", "email");
    private static final ImportFieldSpec VISIT_DATE = ImportFieldSpec.required(
            "visit_date", "Visit date", "15/03/2024", "visit date");
    private static final ImportFieldSpec DISPOSITION = ImportFieldSpec.optional(
            "disposition", "Disposition", "", "disp");
    private static final ImportFieldSpec CONTACTABILITY = ImportFieldSpec.optional(
            "contactability", "Contactability", "");
    private static final ImportFieldSpec CONTACT_PERSON = ImportFieldSpec.optional(
            "contact_person", "Contact person", "", "contact person");
    private static final ImportFieldSpec CONTACT_NUMBER = ImportFieldSpec.optional(
            "contact_number", "Contact number", "", "contact number");
    private static final ImportFieldSpec AMOUNT_COLLECTED = ImportFieldSpec.optional(
            "amount_collected", "Amount collected", "", "amount collected", "collected");
    private static final ImportFieldSpec VISIT_NOTES = ImportFieldSpec.optional(
            "visit_notes", "Visit notes", "", "notes", "remarks");

    private final VisitLogRepository visitLogRepository;

    @Override
    public UploadType supportedType() {
        return UploadType.VISIT;
    }

    @Override
    public List<ImportFieldSpec> fieldSpecs() {
        return List.of(LOAN_NUMBER, AGENT_EMAIL, VISIT_DATE, DISPOSITION, CONTACTABILITY,
                CONTACT_PERSON, CONTACT_NUMBER, AMOUNT_COLLECTED, VISIT_NOTES);
    }

    @Override
    public VisitLog mapRow(Map<String, String> row, int rowNumber, ImportContext context) {
        String loanNumber = ImportValues.findRequired(row, LOAN_NUMBER);

        Allocation allocation = context.getAllocationsByLoanNumber().get(loanNumber);
        if (allocation == null) {
            throw new RowValidationException("loan_number",
                    "Loan number '" + loanNumber + "' not found in this organization", loanNumber);
        }

        User agent = resolveAgent(row, context);

        LocalDate visitDate = ImportValues.parseRequiredDate(
                ImportValues.findRequired(row, VISIT_DATE), "visit_date", "Visit date");

        Disp disp = ImportValues.parseEnum(Disp.class, ImportValues.find(row, DISPOSITION.allNames()));
        Contactability contactability = ImportValues.parseEnum(Contactability.class,
                ImportValues.find(row, CONTACTABILITY.allNames()));
        BigDecimal amountCollected = ImportValues.parseDecimal(
                ImportValues.find(row, AMOUNT_COLLECTED.allNames()));

        Instant visitInstant = visitDate.atStartOfDay(IST).toInstant();

        return VisitLog.builder()
                .allocationId(allocation.getId())
                .loanNumber(allocation.getLoanNumber())
                .agentId(agent.getId())
                .organizationId(context.organizationId())
                .visitDate(visitDate)
                .visitTime(visitInstant)
                .contactability(contactability)
                .contactPerson(blankToNull(ImportValues.find(row, CONTACT_PERSON.allNames())))
                .contactNumber(blankToNull(ImportValues.find(row, CONTACT_NUMBER.allNames())))
                .disp(disp)
                .amountCollected(amountCollected)
                .visitNotes(blankToNull(ImportValues.find(row, VISIT_NOTES.allNames())))
                .latitude(0.0)
                .longitude(0.0)
                .visitStatus(VisitStatus.GPS_UNAVAILABLE)
                .mockLocationDetected(false)
                .approvalStatus(ApprovalStatus.APPROVED)
                .approvedBy(context.getImportedByUserId())
                // Backdated so the visit reads as approved when it happened, not when it was imported.
                .approvedAt(visitInstant)
                .approvalRemarks("Imported from historical data upload")
                .createdBy(context.getImportedByUserId())
                .updatedBy(context.getImportedByUserId())
                .build();
    }

    @Override
    public void persistBatch(List<VisitLog> batch, ImportContext context) {
        Set<String> existing = existingKeys(batch);

        List<VisitLog> fresh = existing.isEmpty()
                ? batch
                : batch.stream().filter(v -> !existing.contains(naturalKey(v))).collect(Collectors.toList());

        if (fresh.size() < batch.size()) {
            log.info("Visit import: skipped {} row(s) already present from an earlier upload",
                    batch.size() - fresh.size());
        }
        if (!fresh.isEmpty()) {
            visitLogRepository.saveAll(fresh);
        }
    }

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

    private Set<String> existingKeys(List<VisitLog> batch) {
        Set<UUID> allocationIds = batch.stream().map(VisitLog::getAllocationId).collect(Collectors.toSet());
        Set<LocalDate> dates = batch.stream().map(VisitLog::getVisitDate).collect(Collectors.toSet());

        if (allocationIds.isEmpty() || dates.isEmpty()) return Set.of();

        Set<String> keys = new HashSet<>();
        for (VisitLog existing : visitLogRepository
                .findByAllocationIdInAndVisitDateInAndIsDeletedFalse(allocationIds, dates)) {
            keys.add(naturalKey(existing));
        }
        return keys;
    }

    /** One agent can only meaningfully log one visit per loan per day in a historical export. */
    private static String naturalKey(VisitLog visit) {
        return visit.getAllocationId() + "|" + visit.getVisitDate() + "|" + visit.getAgentId();
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
