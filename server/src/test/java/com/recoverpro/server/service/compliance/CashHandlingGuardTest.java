package com.recoverpro.server.service.compliance;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.enums.GuardType;
import com.recoverpro.server.enums.PaymentMode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CashHandlingGuardTest {

    @Mock private ComplianceAuditService complianceAuditService;

    private CashHandlingGuard guard;

    @BeforeEach
    void setUp() {
        guard = new CashHandlingGuard(complianceAuditService);
        setLimit(guard, new BigDecimal("50000"));
    }

    private static void setLimit(CashHandlingGuard guard, BigDecimal limit) {
        try {
            var field = CashHandlingGuard.class.getDeclaredField("agentCashLimitInr");
            field.setAccessible(true);
            field.set(guard, limit);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void enforceOnSubmit_missingAcknowledgement_recordsDenialThenThrows() {
        UUID allocationId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();

        assertThatThrownBy(() -> guard.enforceOnSubmit(PaymentMode.CASH, false, allocationId, orgId, actorId))
                .isInstanceOf(BusinessException.class);

        verify(complianceAuditService).record(eq(GuardType.CASH_HANDLING), eq(allocationId), eq(orgId),
                eq(actorId), eq("COLLECTION_SUBMIT"), any());
    }

    @Test
    void enforceOnSubmit_acknowledged_doesNotRecordOrThrow() {
        guard.enforceOnSubmit(PaymentMode.CASH, true, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        verify(complianceAuditService, never()).record(any(), any(), any(), any(), any(), any());
    }

    @Test
    void enforceAgentDailyLimit_breach_recordsDenialThenThrows() {
        UUID allocationId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();

        assertThatThrownBy(() -> guard.enforceAgentDailyLimit(
                new BigDecimal("20000"), new BigDecimal("40000"), allocationId, orgId, actorId))
                .isInstanceOf(BusinessException.class);

        verify(complianceAuditService).record(eq(GuardType.CASH_HANDLING), eq(allocationId), eq(orgId),
                eq(actorId), eq("COLLECTION_SUBMIT"), any());
    }

    @Test
    void enforceOnDeposit_missingSupervisorSign_recordsDenialThenThrows() {
        UUID allocationId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        Collection collection = Collection.builder()
                .allocationId(allocationId).organizationId(orgId).paymentMode(PaymentMode.CASH).build();

        assertThatThrownBy(() -> guard.enforceOnDeposit(collection, actorId))
                .isInstanceOf(BusinessException.class);

        verify(complianceAuditService).record(eq(GuardType.CASH_HANDLING), eq(allocationId), eq(orgId),
                eq(actorId), eq("COLLECTION_DEPOSIT"), any());
    }

    @Test
    void enforceOnDeposit_signed_doesNotRecordOrThrow() {
        Collection collection = Collection.builder()
                .allocationId(UUID.randomUUID()).organizationId(UUID.randomUUID())
                .paymentMode(PaymentMode.CASH)
                .cashSupervisorSignedBy(UUID.randomUUID()).cashSupervisorSignedAt(Instant.now())
                .build();

        guard.enforceOnDeposit(collection, UUID.randomUUID());

        verify(complianceAuditService, never()).record(any(), any(), any(), any(), any(), any());
    }
}
