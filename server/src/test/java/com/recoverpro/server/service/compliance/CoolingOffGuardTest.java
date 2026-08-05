package com.recoverpro.server.service.compliance;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.enums.GuardType;
import com.recoverpro.server.repository.AllocationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoolingOffGuardTest {

    @Mock private AllocationRepository allocationRepository;
    @Mock private ComplianceAuditService complianceAuditService;

    private CoolingOffGuard guard;

    @BeforeEach
    void setUp() {
        guard = new CoolingOffGuard(allocationRepository, complianceAuditService);
    }

    @Test
    void enforce_inCoolingOff_recordsDenialThenThrows() {
        UUID allocationId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        Instant coolingOffUntil = Instant.now().plusSeconds(3600);
        Allocation allocation = Allocation.builder()
                .id(allocationId).coolingOffUntil(coolingOffUntil).build();
        when(allocationRepository.findById(allocationId)).thenReturn(Optional.of(allocation));

        assertThatThrownBy(() -> guard.enforce(allocationId, orgId, actorId))
                .isInstanceOf(CoolingOffActiveException.class);

        verify(complianceAuditService).record(eq(GuardType.COOLING_OFF), eq(allocationId), eq(orgId),
                eq(actorId), eq("CREATE_PTP"), any());
    }

    @Test
    void enforce_notInCoolingOff_doesNotRecordOrThrow() {
        UUID allocationId = UUID.randomUUID();
        Allocation allocation = Allocation.builder().id(allocationId).build();
        when(allocationRepository.findById(allocationId)).thenReturn(Optional.of(allocation));

        guard.enforce(allocationId, UUID.randomUUID(), UUID.randomUUID());

        verify(complianceAuditService, never()).record(any(), any(), any(), any(), any(), any());
    }
}
