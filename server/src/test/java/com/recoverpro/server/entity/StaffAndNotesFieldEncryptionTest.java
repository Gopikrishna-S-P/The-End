package com.recoverpro.server.entity;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.ChatSessionRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.PtpHistoryRepository;
import com.recoverpro.server.repository.PtpRepository;
import com.recoverpro.server.repository.UserCreationRequestRepository;
import com.recoverpro.server.repository.VisitLogRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SEC-PLAN S12: staff-name and free-text note fields that sat right next to
 * already-encrypted borrower fields on the same entities, but were themselves
 * left plaintext - an inconsistency in applying the established
 * EncryptedStringConverter convention rather than a deliberate exception.
 */
class StaffAndNotesFieldEncryptionTest extends AbstractIntegrationTest {

    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private VisitLogRepository visitLogRepository;
    @Autowired private PtpRepository ptpRepository;
    @Autowired private PtpHistoryRepository ptpHistoryRepository;
    @Autowired private ChatSessionRepository chatSessionRepository;
    @Autowired private UserCreationRequestRepository userCreationRequestRepository;

    private Organization org;
    private FileUpload upload;
    private Allocation allocation;

    private UUID ptpHistoryId;
    private UUID ptpId;
    private UUID visitLogId;
    private String chatSessionId;
    private UUID userCreationRequestId;

    @BeforeEach
    void setUpAllocation() {
        org = createOrg("PiiCoverage");
        RlsOrgIdHolder.set(org.getId());
        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(org)
                .originalFilename("it-test.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("it-test-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());
        allocation = allocationRepository.save(Allocation.builder()
                .fileUpload(upload)
                .organization(org)
                .loanNumber("LN-IT-" + System.nanoTime())
                .borrowerName("Test Borrower")
                .status(AllocationStatus.UNASSIGNED)
                .totalDue(BigDecimal.TEN)
                .build());
    }

    @AfterEach
    void cleanupChildRows() {
        RlsOrgIdHolder.set(org.getId());
        if (ptpHistoryId != null) ptpHistoryRepository.deleteById(ptpHistoryId);
        if (ptpId != null) ptpRepository.deleteById(ptpId);
        if (visitLogId != null) visitLogRepository.deleteById(visitLogId);
        if (chatSessionId != null) chatSessionRepository.deleteById(chatSessionId);
        if (userCreationRequestId != null) userCreationRequestRepository.deleteById(userCreationRequestId);
        allocationRepository.deleteById(allocation.getId());
        fileUploadRepository.deleteById(upload.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void userNameFields_areStoredEncrypted() {
        User user = createUser(org, "ROLE_FO");
        String stored = jdbcTemplate.queryForObject(
                "SELECT first_name FROM users WHERE id = ?", String.class, user.getId());
        assertThat(stored).startsWith("enc:").isNotEqualTo("Integration");
    }

    @Test
    void userCreationRequestNameFields_areStoredEncrypted() {
        User requestedBy = createUser(org, "ROLE_ORG_ADMIN");
        UserCreationRequest request = userCreationRequestRepository.save(UserCreationRequest.builder()
                .requestedEmail("new-" + UUID.randomUUID() + "@test.local")
                .requestedFirstName("Jane")
                .requestedLastName("Doe")
                .requestedRole(UserCreationRequest.RequestedRole.ORG_USER)
                .requestedBy(requestedBy)
                .build());
        userCreationRequestId = request.getId();

        String firstName = jdbcTemplate.queryForObject(
                "SELECT requested_first_name FROM user_creation_requests WHERE id = ?", String.class, request.getId());
        String lastName = jdbcTemplate.queryForObject(
                "SELECT requested_last_name FROM user_creation_requests WHERE id = ?", String.class, request.getId());

        assertThat(firstName).startsWith("enc:").isNotEqualTo("Jane");
        assertThat(lastName).startsWith("enc:").isNotEqualTo("Doe");
    }

    @Test
    void visitLogNotesFields_areStoredEncrypted() {
        User agent = createUser(org, "ROLE_FO");
        VisitLog visitLog = visitLogRepository.save(VisitLog.builder()
                .allocationId(allocation.getId())
                .loanNumber(allocation.getLoanNumber())
                .agentId(agent.getId())
                .organizationId(org.getId())
                .visitDate(LocalDate.now())
                .visitNotes("Spoke with borrower's brother, phone 98765xxxxx")
                .internalRemarks("Escalate - borrower relocated to 12 MG Road")
                .createdBy(agent.getId())
                .latitude(12.9)
                .longitude(77.6)
                .build());
        visitLogId = visitLog.getId();

        String notes = jdbcTemplate.queryForObject(
                "SELECT visit_notes FROM visit_logs WHERE id = ?", String.class, visitLog.getId());
        String remarks = jdbcTemplate.queryForObject(
                "SELECT internal_remarks FROM visit_logs WHERE id = ?", String.class, visitLog.getId());

        assertThat(notes).startsWith("enc:");
        assertThat(remarks).startsWith("enc:");
    }

    @Test
    void ptpRecordAgentName_isStoredEncrypted() {
        User agent = createUser(org, "ROLE_FO");
        PtpRecord ptp = ptpRepository.save(PtpRecord.builder()
                .allocationId(allocation.getId())
                .agentId(agent.getId())
                .agentName("Agent Smith")
                .loanNumber(allocation.getLoanNumber())
                .borrowerName("Test Borrower")
                .promisedDate(LocalDate.now().plusDays(3))
                .promisedAmount(BigDecimal.TEN)
                .status(PtpStatus.PENDING)
                .createdBy(agent.getId())
                .build());
        ptpId = ptp.getId();

        String stored = jdbcTemplate.queryForObject(
                "SELECT agent_name FROM ptp_records WHERE id = ?", String.class, ptp.getId());
        assertThat(stored).startsWith("enc:").isNotEqualTo("Agent Smith");
    }

    @Test
    void ptpHistoryChangedByName_isStoredEncrypted() {
        User agent = createUser(org, "ROLE_FO");
        PtpRecord ptp = ptpRepository.save(PtpRecord.builder()
                .allocationId(allocation.getId())
                .agentId(agent.getId())
                .agentName("Agent Smith")
                .loanNumber(allocation.getLoanNumber())
                .borrowerName("Test Borrower")
                .promisedDate(LocalDate.now().plusDays(3))
                .promisedAmount(BigDecimal.TEN)
                .status(PtpStatus.PENDING)
                .createdBy(agent.getId())
                .build());
        ptpId = ptp.getId();

        PtpHistory history = ptpHistoryRepository.save(PtpHistory.builder()
                .ptpId(ptp.getId())
                .allocationId(allocation.getId())
                .newStatus(PtpStatus.PENDING)
                .changedBy(agent.getId())
                .changedByName("Agent Smith")
                .build());
        ptpHistoryId = history.getId();

        String stored = jdbcTemplate.queryForObject(
                "SELECT changed_by_name FROM ptp_history WHERE id = ?", String.class, history.getId());
        assertThat(stored).startsWith("enc:").isNotEqualTo("Agent Smith");
    }

    @Test
    void chatSessionAgentFirstName_isStoredEncrypted() {
        User agent = createUser(org, "ROLE_FO");
        ChatSession session = chatSessionRepository.save(ChatSession.builder()
                .agentId(agent.getId())
                .agentFirstName("Priya")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        chatSessionId = session.getId();

        String stored = jdbcTemplate.queryForObject(
                "SELECT agent_first_name FROM lucien_chat_sessions WHERE id = ?", String.class, session.getId());
        assertThat(stored).startsWith("enc:").isNotEqualTo("Priya");
    }
}
