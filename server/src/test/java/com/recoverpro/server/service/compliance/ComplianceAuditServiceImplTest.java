package com.recoverpro.server.service.compliance;

import com.recoverpro.server.entity.ComplianceDecision;
import com.recoverpro.server.enums.GuardType;
import com.recoverpro.server.repository.ComplianceDecisionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ComplianceAuditServiceImplTest {

    @Mock private ComplianceDecisionRepository complianceDecisionRepository;

    private ComplianceAuditServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ComplianceAuditServiceImpl(complianceDecisionRepository);
    }

    @Test
    void record_persistsAllFieldsOfTheDenial() {
        UUID allocationId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();

        service.record(GuardType.COOLING_OFF, allocationId, orgId, actorId, "CREATE_PTP", "in cooling-off until X");

        ArgumentCaptor<ComplianceDecision> captor = ArgumentCaptor.forClass(ComplianceDecision.class);
        verify(complianceDecisionRepository).save(captor.capture());
        ComplianceDecision saved = captor.getValue();
        assertThat(saved.getGuardType()).isEqualTo(GuardType.COOLING_OFF);
        assertThat(saved.getAllocationId()).isEqualTo(allocationId);
        assertThat(saved.getOrgId()).isEqualTo(orgId);
        assertThat(saved.getActorId()).isEqualTo(actorId);
        assertThat(saved.getAction()).isEqualTo("CREATE_PTP");
        assertThat(saved.getReason()).isEqualTo("in cooling-off until X");
    }
}
