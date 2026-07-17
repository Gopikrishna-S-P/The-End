package com.recoverpro.server.entity;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.encryption.LookupHashService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SEC-PLAN S12: Borrower.ckycId was the one field on the entity not covered by
 * the established EncryptedStringConverter + xxxLookupHash pattern already
 * used for phone/email on the same entity - a KYC identifier is exactly the
 * kind of financial-identifier column the pattern exists for.
 */
class BorrowerCkycIdEncryptionTest extends AbstractIntegrationTest {

    @Autowired private BorrowerRepository borrowerRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private Organization org;
    private UUID borrowerId;

    @BeforeEach
    void setUp() {
        org = createOrg("CkycCoverage");
        RlsOrgIdHolder.set(org.getId());
    }

    @AfterEach
    void tearDown() {
        RlsOrgIdHolder.set(org.getId());
        if (borrowerId != null) borrowerRepository.deleteById(borrowerId);
        RlsOrgIdHolder.clear();
    }

    @Test
    void ckycId_isStoredEncryptedWithLookupHash() {
        String ckycId = "CKYC" + System.nanoTime();
        Borrower borrower = borrowerRepository.save(Borrower.builder()
                .organizationId(org.getId())
                .ckycId(ckycId)
                .firstName("Test")
                .build());
        borrowerId = borrower.getId();

        String storedCkycId = jdbcTemplate.queryForObject(
                "SELECT ckyc_id FROM borrowers WHERE id = ?", String.class, borrower.getId());
        String storedHash = jdbcTemplate.queryForObject(
                "SELECT ckyc_id_lookup_hash FROM borrowers WHERE id = ?", String.class, borrower.getId());

        assertThat(storedCkycId).startsWith("enc:").isNotEqualTo(ckycId);
        assertThat(storedHash).isEqualTo(LookupHashService.get().hash(ckycId));
    }

    @Test
    void findByOrganizationIdAndCkycIdLookupHash_findsBorrowerByPlaintextCkycId() {
        String ckycId = "CKYC" + System.nanoTime();
        Borrower borrower = borrowerRepository.save(Borrower.builder()
                .organizationId(org.getId())
                .ckycId(ckycId)
                .firstName("Test")
                .build());
        borrowerId = borrower.getId();

        String hash = LookupHashService.get().hash(ckycId);
        Optional<Borrower> found = borrowerRepository.findByOrganizationIdAndCkycIdLookupHash(org.getId(), hash);

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(borrower.getId());
        assertThat(found.get().getCkycId()).isEqualTo(ckycId);
    }
}
