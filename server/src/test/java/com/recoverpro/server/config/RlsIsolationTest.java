package com.recoverpro.server.config;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class RlsIsolationTest extends AbstractIntegrationTest {

    @Autowired private BorrowerRepository borrowerRepository;

    private Borrower borrowerInOrgA;

    @AfterEach
    void clearRlsContext() {
        RlsOrgIdHolder.clear();
        if (borrowerInOrgA != null) {
            RlsOrgIdHolder.set(borrowerInOrgA.getOrganizationId());
            borrowerRepository.deleteById(borrowerInOrgA.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void connectionCheckout_scopesQueriesToTheOrgSetInRlsOrgIdHolder() {
        Organization orgA = createOrg("rls-a");
        Organization orgB = createOrg("rls-b");

        RlsOrgIdHolder.set(orgA.getId());
        borrowerInOrgA = borrowerRepository.save(
                Borrower.builder().organizationId(orgA.getId()).firstName("Alice").build());

        // Org B's context must not see org A's row — proves the DB-layer RLS policy holds
        // even with zero service-layer org checks involved (direct repository call).
        RlsOrgIdHolder.set(orgB.getId());
        Optional<Borrower> asOrgB = borrowerRepository.findById(borrowerInOrgA.getId());
        assertThat(asOrgB).isEmpty();

        // Org A's own context must see it.
        RlsOrgIdHolder.set(orgA.getId());
        Optional<Borrower> asOrgA = borrowerRepository.findById(borrowerInOrgA.getId());
        assertThat(asOrgA).isPresent();

        // No org context at all (e.g. RlsOrgIdHolder never set) must fail closed, not open.
        RlsOrgIdHolder.clear();
        Optional<Borrower> asNoOrg = borrowerRepository.findById(borrowerInOrgA.getId());
        assertThat(asNoOrg).isEmpty();
    }
}
