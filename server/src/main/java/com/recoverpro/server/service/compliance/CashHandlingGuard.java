package com.recoverpro.server.service.compliance;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.enums.GuardType;
import com.recoverpro.server.enums.PaymentMode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CashHandlingGuard {

    private final ComplianceAuditService complianceAuditService;

    @Value("${app.compliance.agent-cash-limit-inr:50000}")
    private BigDecimal agentCashLimitInr;

    public void enforceOnSubmit(PaymentMode mode, boolean acknowledged, UUID allocationId, UUID orgId, UUID actorId) {
        if (mode != PaymentMode.CASH) return;
        if (!acknowledged) {
            log.info("Cash collection rejected: missing cashHandlingAcknowledged flag");
            String reason = "Cash collections require explicit acknowledgement of the cash-handling policy "
                    + "(RBI DLG 2022 §C.5). Resubmit with cashHandlingAcknowledged=true.";
            complianceAuditService.record(GuardType.CASH_HANDLING, allocationId, orgId, actorId,
                    "COLLECTION_SUBMIT", reason);
            throw new BusinessException(reason);
        }
    }

    public void enforceAgentDailyLimit(BigDecimal submittedAmount, BigDecimal todayCashTotal,
                                        UUID allocationId, UUID orgId, UUID actorId) {
        if (submittedAmount == null || submittedAmount.compareTo(BigDecimal.ZERO) <= 0) return;
        BigDecimal projected = todayCashTotal.add(submittedAmount);
        if (projected.compareTo(agentCashLimitInr) > 0) {
            log.warn("Cash daily-limit breach attempt: today={} + new={} > limit={}",
                    todayCashTotal, submittedAmount, agentCashLimitInr);
            String reason = "RBI cash-handling limit: daily cash cap of ₹" + agentCashLimitInr
                    + " would be exceeded (today: ₹" + todayCashTotal
                    + " + submitted: ₹" + submittedAmount + ").";
            complianceAuditService.record(GuardType.CASH_HANDLING, allocationId, orgId, actorId,
                    "COLLECTION_SUBMIT", reason);
            throw new BusinessException(reason);
        }
    }

    public void enforceOnDeposit(Collection collection, UUID actorId) {
        if (collection.getPaymentMode() != PaymentMode.CASH) return;
        UUID supervisor = collection.getCashSupervisorSignedBy();
        Instant when = collection.getCashSupervisorSignedAt();
        if (supervisor == null || when == null) {
            String reason = "Cash collections require a supervisor counter-sign before deposit "
                    + "(RBI DLG 2022 §C.5). Have a supervisor sign before retrying.";
            complianceAuditService.record(GuardType.CASH_HANDLING, collection.getAllocationId(),
                    collection.getOrganizationId(), actorId, "COLLECTION_DEPOSIT", reason);
            throw new BusinessException(reason);
        }
    }
}
