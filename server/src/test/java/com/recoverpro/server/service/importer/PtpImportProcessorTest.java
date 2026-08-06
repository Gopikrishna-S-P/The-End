package com.recoverpro.server.service.importer;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.repository.PtpRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The nightly sweep in PtpServiceImpl.autoMarkExpiredPtpsAsBroken() picks up every PENDING
 * record whose promised date has passed and calls PtpEscalationService.onPtpBroken(...). A
 * backfill that left stale promises PENDING would therefore fire live escalation for promises
 * settled years ago. These tests pin the rule that prevents that.
 */
@ExtendWith(MockitoExtension.class)
class PtpImportProcessorTest {

    @Mock private PtpRepository ptpRepository;

    private PtpImportProcessor processor;
    private ImportContext context;
    private UUID orgId;

    @BeforeEach
    void setUp() {
        processor = new PtpImportProcessor(ptpRepository);
        orgId = UUID.randomUUID();

        Organization org = new Organization();
        org.setId(orgId);

        Allocation allocation = Allocation.builder()
                .id(UUID.randomUUID())
                .loanNumber("LN-1")
                .borrowerName("Jane Doe")
                .build();

        User agent = new User();
        agent.setId(UUID.randomUUID());
        agent.setEmail("agent@example.com");
        agent.setFirstName("Asha");
        agent.setLastName("Rao");
        agent.setOrganizationId(orgId);

        context = ImportContext.builder()
                .organization(org)
                .fileUpload(FileUpload.builder().build())
                .importedByUserId(UUID.randomUUID())
                .historicalImport(true)
                .allocationsByLoanNumber(Map.of("LN-1", allocation))
                .usersByEmail(Map.of("agent@example.com", agent))
                .build();
    }

    private Map<String, String> row(String promisedDate, String status) {
        Map<String, String> row = new HashMap<>();
        row.put("loan_number", "LN-1");
        row.put("agent_email", "agent@example.com");
        row.put("promised_date", promisedDate);
        row.put("promised_amount", "5000");
        if (status != null) row.put("status", status);
        return row;
    }

    private static String asDate(LocalDate date) {
        return date.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    @Test
    void pastDatedPendingRow_isCoercedToBroken_soTheNightlySweepNeverEscalatesIt() {
        LocalDate past = LocalDate.now().minusYears(2);

        PtpRecord ptp = processor.mapRow(row(asDate(past), "PENDING"), 2, context);

        assertThat(ptp.getStatus()).isEqualTo(PtpStatus.BROKEN);
        assertThat(ptp.getBrokenReason()).contains("Imported from historical data");
        assertThat(ptp.getBrokenAt()).isNotNull();
    }

    @Test
    void pastDatedRowWithNoStatus_defaultsToBroken_ratherThanPending() {
        PtpRecord ptp = processor.mapRow(row(asDate(LocalDate.now().minusMonths(6)), null), 2, context);

        assertThat(ptp.getStatus()).isEqualTo(PtpStatus.BROKEN);
    }

    @Test
    void futureDatedPendingRow_staysPending_soEscalationResumesNormally() {
        LocalDate future = LocalDate.now().plusDays(10);

        PtpRecord ptp = processor.mapRow(row(asDate(future), "PENDING"), 2, context);

        assertThat(ptp.getStatus()).isEqualTo(PtpStatus.PENDING);
        // Left false so the morning reminder job can still pick it up on its due date.
        assertThat(ptp.getReminderSent()).isFalse();
        assertThat(ptp.getReminderSentAt()).isNull();
    }

    @Test
    void pastDatedRow_isMarkedAsAlreadyReminded_soItDoesNotReadAsAwaitingOutreach() {
        PtpRecord ptp = processor.mapRow(row(asDate(LocalDate.now().minusDays(30)), "FULFILLED"), 2, context);

        assertThat(ptp.getReminderSent()).isTrue();
        assertThat(ptp.getReminderSentAt()).isNotNull();
    }

    @Test
    void terminalStatusFromFile_isPreserved_notOverwritten() {
        PtpRecord ptp = processor.mapRow(row(asDate(LocalDate.now().minusDays(30)), "FULFILLED"), 2, context);

        assertThat(ptp.getStatus()).isEqualTo(PtpStatus.FULFILLED);
        assertThat(ptp.getFulfilledAt()).isNotNull();
        assertThat(ptp.getBrokenAt()).isNull();
    }

    /**
     * Regression: header matching used to fall back to substring, so "collected_amount"
     * normalised to "collectedamount" matched the alias "amount" and the collected figure was
     * silently filed as the promised one. Matching is exact now, so the row fails instead.
     */
    @Test
    void collectedAmountIsNeverMistakenForPromisedAmount() {
        Map<String, String> row = new HashMap<>();
        row.put("loan_number", "LN-1");
        row.put("agent_email", "agent@example.com");
        row.put("promised_date", asDate(LocalDate.now().plusDays(5)));
        row.put("collected_amount", "250");

        assertThatThrownBy(() -> processor.mapRow(row, 2, context))
                .isInstanceOf(RowValidationException.class)
                .hasMessageContaining("Promised amount is required");
    }

    @Test
    void headerMatchingIgnoresCaseSpacingAndPunctuation() {
        Map<String, String> row = new HashMap<>();
        row.put("Loan Number", "LN-1");
        row.put("AGENT-EMAIL", "agent@example.com");
        row.put("Promised Date", asDate(LocalDate.now().plusDays(5)));
        row.put("promised_amount", "5000");

        PtpRecord ptp = processor.mapRow(row, 2, context);

        assertThat(ptp.getLoanNumber()).isEqualTo("LN-1");
        assertThat(ptp.getPromisedAmount()).isEqualByComparingTo("5000");
    }

    @Test
    void fieldSpecsCoverEveryColumnMapRowReads() {
        assertThat(processor.fieldSpecs())
                .extracting(ImportFieldSpec::name)
                .contains("loan_number", "agent_email", "promised_date", "promised_amount",
                        "status", "collected_amount", "contact_notes", "broken_reason");
    }

    @Test
    void unknownLoanNumber_failsTheRowRatherThanTheFile() {
        Map<String, String> row = row(asDate(LocalDate.now()), "PENDING");
        row.put("loan_number", "LN-DOES-NOT-EXIST");

        assertThatThrownBy(() -> processor.mapRow(row, 2, context))
                .isInstanceOf(RowValidationException.class)
                .hasMessageContaining("not found in this organization");
    }

    @Test
    void agentFromAnotherOrg_isRejected() {
        User foreign = new User();
        foreign.setId(UUID.randomUUID());
        foreign.setEmail("agent@example.com");
        foreign.setOrganizationId(UUID.randomUUID());

        ImportContext crossOrg = ImportContext.builder()
                .organization(context.getOrganization())
                .fileUpload(context.getFileUpload())
                .importedByUserId(context.getImportedByUserId())
                .historicalImport(true)
                .allocationsByLoanNumber(context.getAllocationsByLoanNumber())
                .usersByEmail(Map.of("agent@example.com", foreign))
                .build();

        assertThatThrownBy(() -> processor.mapRow(row(asDate(LocalDate.now()), "PENDING"), 2, crossOrg))
                .isInstanceOf(RowValidationException.class)
                .hasMessageContaining("does not belong to this organization");
    }
}
