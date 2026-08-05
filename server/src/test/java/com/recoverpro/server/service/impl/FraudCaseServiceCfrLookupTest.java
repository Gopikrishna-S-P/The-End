package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.BusinessException;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * By default (no fraud.cfr-lookup.enabled override), CFR integration does not exist -
 * runCfrLookup must refuse rather than silently write a fake "NO_HIT" result (SYSTEM-PLAN SP11).
 */
class FraudCaseServiceCfrLookupTest extends AbstractIntegrationTest {

    @Autowired private FraudCaseService fraudCaseService;
    @Autowired private FraudCaseRepository fraudCaseRepository;

    private FraudCase fraudCase;
    private Organization org;

    @AfterEach
    void cleanup() {
        if (fraudCase != null) {
            RlsOrgIdHolder.set(org.getId());
            fraudCaseRepository.deleteById(fraudCase.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void runCfrLookup_disabledByDefault_throwsAndNeverWritesFakeNoHit() {
        org = createOrg("sp11-a");
        User reporter = createUser(org, "ROLE_FO");

        RlsOrgIdHolder.set(org.getId());
        fraudCase = fraudCaseRepository.save(FraudCase.builder()
                .organizationId(org.getId())
                .caseNumber("FRD-IT-" + System.nanoTime())
                .status(FraudCaseStatus.REPORTED)
                .category(FraudCategory.CYBER_FRAUD)
                .amountInvolved(BigDecimal.TEN)
                .description("SP11 test fraud case")
                .reportedByUserId(reporter.getId())
                .reportedAt(Instant.now())
                .build());

        actAsUser(reporter);
        RlsOrgIdHolder.set(org.getId());

        assertThatThrownBy(() -> fraudCaseService.runCfrLookup(fraudCase.getId(), reporter.getId()))
                .isInstanceOf(BusinessException.class);

        RlsOrgIdHolder.set(org.getId());
        FraudCase reloaded = fraudCaseRepository.findById(fraudCase.getId()).orElseThrow();
        assertThat(reloaded.getCfrLookupAt()).isNull();
        assertThat(reloaded.getCfrLookupResult()).isNull();
    }
}
