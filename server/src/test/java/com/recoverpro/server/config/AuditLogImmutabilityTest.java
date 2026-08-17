package com.recoverpro.server.config;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.AllocationAuditLog;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.SettlementAuditLog;
import com.recoverpro.server.entity.SettlementOffer;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.enums.OrganizationType;
import com.recoverpro.server.enums.UploadType;
import com.recoverpro.server.repository.AllocationAuditLogRepository;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.SettlementAuditLogRepository;
import com.recoverpro.server.repository.SettlementOfferRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Proves trg_settlement_audit_immutable / trg_allocation_audit_immutable (V084) block UPDATE and
 * DELETE the same way trg_user_action_audit_immutable etc. (V006) already do for the other four
 * audit tables, and that INSERT is unaffected.
 * <p>
 * Deliberately NOT wrapped in a rolled-back Spring test transaction. {@link RlsOrgIdHolder} only
 * takes effect on the next JDBC connection checkout ({@link RlsAwareDataSource}); a single outer
 * transaction would hold one connection for the whole test, so a later {@code set()} call would
 * be a no-op against that connection's already-stamped session GUC. {@link RlsIsolationTest} uses
 * the same non-transactional, real-commit pattern for the same reason.
 * <p>
 * Fixture rows (org/user/file upload/allocation/settlement offer, and the audit rows themselves)
 * are intentionally left in place rather than cleaned up in {@code @AfterEach}: the audit rows can
 * never be deleted by construction (that's the behavior under test), and settlement_audit_logs'
 * FK-RESTRICT constraints to settlement_offers/allocations/users mean none of their parent rows
 * can be deleted either as long as the audit row exists. That's an accepted trade-off for a real
 * immutability test against a dev database, not an oversight.
 */
class AuditLogImmutabilityTest extends AbstractIntegrationTest {

    @Autowired private DataSource dataSource;
    @Autowired private AllocationAuditLogRepository allocationAuditLogRepository;
    @Autowired private SettlementAuditLogRepository settlementAuditLogRepository;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private SettlementOfferRepository settlementOfferRepository;

    @AfterEach
    void clearRlsContext() {
        RlsOrgIdHolder.clear();
    }

    @Test
    void allocationAuditLog_insertSucceeds_updateAndDeleteAreRejected() throws SQLException {
        // allocation_audit_logs carries no FK constraints (V056), so a random allocation/user id
        // is sufficient to prove the trigger fires -- referential validity isn't what's under test.
        AllocationAuditLog saved = allocationAuditLogRepository.save(AllocationAuditLog.builder()
                .allocationId(UUID.randomUUID())
                .action("STATUS_CHANGED")
                .performedBy(UUID.randomUUID())
                .previousValue("ACTIVE")
                .newValue("CLOSED")
                .build());
        assertThat(saved.getId()).isNotNull();

        assertUpdateAndDeleteRejected("allocation_audit_logs", "new_value", saved.getId());
    }

    @Test
    void settlementAuditLog_insertSucceeds_updateAndDeleteAreRejected() throws SQLException {
        // settlement_audit_logs has real FK constraints to settlement_offers/allocations/users
        // (V038, ON DELETE RESTRICT), so unlike allocation_audit_logs this needs a valid parent
        // chain: organization -> file_upload + user -> allocation -> settlement_offer.
        Organization org = organizationRepository.save(Organization.builder()
                .name("audit-immutable-settlement-" + UUID.randomUUID())
                .code(("T" + UUID.randomUUID().toString().replace("-", "")).substring(0, 20))
                .organizationType(OrganizationType.ORGANIZATION)
                .isActive(true)
                .lookupHashPepper(UUID.randomUUID().toString().replace("-", "")
                        + UUID.randomUUID().toString().replace("-", ""))
                .build());

        User user = userRepository.save(User.builder()
                .organizationId(org.getId())
                .email("it-" + UUID.randomUUID() + "@test.local")
                .passwordHash(passwordEncoder.encode("Test1234!"))
                .firstName("Immutability")
                .lastName("Fixture")
                .enabled(true)
                .roles(Set.of())
                .build());

        RlsOrgIdHolder.set(org.getId());

        FileUpload fileUpload = fileUploadRepository.save(FileUpload.builder()
                .organization(org)
                .originalFilename("fixture.csv")
                .contentType("text/csv")
                .fileSizeBytes(10L)
                .sha256Hash(UUID.randomUUID().toString().replace("-", ""))
                .uploadType(UploadType.ALLOCATION)
                .isHistoricalImport(false)
                .status(FileUploadStatus.COMPLETED)
                .isDeleted(false)
                .build());

        Allocation allocation = allocationRepository.save(Allocation.builder()
                .fileUpload(fileUpload)
                .organization(org)
                .loanNumber("LN-IMMUTABLE-" + UUID.randomUUID())
                .borrowerName("Immutability Test Borrower")
                .isDeleted(false)
                .build());

        SettlementOffer offer = settlementOfferRepository.save(SettlementOffer.builder()
                .organizationId(org.getId())
                .allocationId(allocation.getId())
                .outstandingAtOffer(new BigDecimal("10000.00"))
                .offeredAmount(new BigDecimal("8000.00"))
                .discountPct(new BigDecimal("20.00"))
                .tenorDays(30)
                .validityUntil(Instant.now().plusSeconds(86_400))
                .draftedByUserId(user.getId())
                .build());

        SettlementAuditLog saved = settlementAuditLogRepository.save(SettlementAuditLog.builder()
                .settlementOfferId(offer.getId())
                .allocationId(allocation.getId())
                .action("STATUS_CHANGED")
                .performedBy(user.getId())
                .previousStatus("DRAFT")
                .newStatus("PROPOSED")
                .build());
        assertThat(saved.getId()).isNotNull();

        assertUpdateAndDeleteRejected("settlement_audit_logs", "new_status", saved.getId());
    }

    /**
     * Attempts UPDATE then DELETE against the given committed row, each in its own explicit JDBC
     * transaction (rolled back immediately after, whether it throws or not), and asserts the
     * immutability trigger rejects both. {@code table}/{@code updateColumn} are hardcoded literals
     * from the two call sites above, never external input.
     */
    private void assertUpdateAndDeleteRejected(String table, String updateColumn, UUID id) throws SQLException {
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);

            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE " + table + " SET " + updateColumn + " = 'TAMPERED' WHERE id = ?")) {
                ps.setObject(1, id);
                assertThatThrownBy(ps::executeUpdate).hasMessageContaining("audit log is immutable");
            } finally {
                conn.rollback();
            }

            try (PreparedStatement ps = conn.prepareStatement("DELETE FROM " + table + " WHERE id = ?")) {
                ps.setObject(1, id);
                assertThatThrownBy(ps::executeUpdate).hasMessageContaining("audit log is immutable");
            } finally {
                conn.rollback();
            }
        }
    }
}
