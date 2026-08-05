package com.recoverpro.server;

import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class EndToEndTenantIsolationTest extends AbstractIntegrationTest {

    @Autowired private BorrowerRepository borrowerRepository;

    private Borrower borrowerInOrgA;
    private Organization orgA;

    @AfterEach
    void cleanup() {
        if (borrowerInOrgA != null) {
            RlsOrgIdHolder.set(orgA.getId());
            borrowerRepository.deleteById(borrowerInOrgA.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void orgBUserWithValidTokenAndCorrectRole_stillCannotReadOrgAsBorrowerById() {
        orgA = createOrg("e2e-a");
        Organization orgB = createOrg("e2e-b");

        RlsOrgIdHolder.set(orgA.getId());
        borrowerInOrgA = borrowerRepository.save(
                Borrower.builder().organizationId(orgA.getId()).firstName("Bob").build());
        RlsOrgIdHolder.clear();

        // Same role as an org-A admin would have, valid signed token, fully authenticated —
        // the only difference is which org the token's user belongs to.
        String orgBAdminToken = tokenFor(orgB, "ROLE_ORG_ADMIN");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/borrowers/" + borrowerInOrgA.getId()), HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(orgBAdminToken)), String.class);

        assertThat(response.getStatusCode()).isIn(HttpStatus.NOT_FOUND, HttpStatus.FORBIDDEN);
    }

    @Test
    void orgAUserWithValidTokenAndCorrectRole_canReadOwnBorrower() {
        orgA = createOrg("e2e-own");
        RlsOrgIdHolder.set(orgA.getId());
        borrowerInOrgA = borrowerRepository.save(
                Borrower.builder().organizationId(orgA.getId()).firstName("Carol").build());
        RlsOrgIdHolder.clear();

        String orgAToken = tokenFor(orgA, "ROLE_ORG_ADMIN");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/borrowers/" + borrowerInOrgA.getId()), HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(orgAToken)), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
