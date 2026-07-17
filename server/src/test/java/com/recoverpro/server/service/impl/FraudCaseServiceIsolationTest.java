package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.FraudCase;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.FraudCaseStatus;
import com.recoverpro.server.enums.FraudCategory;
import com.recoverpro.server.repository.FraudCaseRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.FraudCaseService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FraudCaseServiceIsolationTest extends AbstractIntegrationTest {

    @Autowired private FraudCaseService fraudCaseService;
    @Autowired private FraudCaseRepository fraudCaseRepository;

    private FraudCase caseInOrgA;
    private Organization orgA;

    @AfterEach
    void cleanup() {
        if (caseInOrgA != null) {
            RlsOrgIdHolder.set(orgA.getId());
            fraudCaseRepository.deleteById(caseInOrgA.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void getById_crossOrg_throwsNotFound() {
        orgA = createOrg("sp12-a");
        Organization orgB = createOrg("sp12-b");

        User reporterInOrgA = createUser(orgA, "ROLE_FO");
        RlsOrgIdHolder.set(orgA.getId());
        caseInOrgA = fraudCaseRepository.save(FraudCase.builder()
                .organizationId(orgA.getId())
                .caseNumber("FRD-IT-" + System.nanoTime())
                .status(FraudCaseStatus.REPORTED)
                .category(FraudCategory.CYBER_FRAUD)
                .amountInvolved(BigDecimal.TEN)
                .description("Integration test fraud case")
                .reportedByUserId(reporterInOrgA.getId())
                .reportedAt(Instant.now())
                .build());
        RlsOrgIdHolder.clear();

        User strangerInOrgB = createUser(orgB, "ROLE_ORG_ADMIN");
        actAsUser(strangerInOrgB);
        // Deliberately re-point the RLS session context at org A (as if RLS were absent/misconfigured
        // for this call path) so this test proves the SERVICE-LAYER OrgIsolationGuard check specifically,
        // independent of the Phase-1 RLS backstop which would otherwise mask the service-layer gap.
        RlsOrgIdHolder.set(orgA.getId());

        assertThatThrownBy(() -> fraudCaseService.getById(caseInOrgA.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
