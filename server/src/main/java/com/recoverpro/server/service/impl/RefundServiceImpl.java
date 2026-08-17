package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.PlatformInvoice;
import com.recoverpro.server.entity.Refund;
import com.recoverpro.server.enums.AuditAction;
import com.recoverpro.server.enums.AuditResourceType;
import com.recoverpro.server.enums.RefundStatus;
import com.recoverpro.server.repository.PlatformInvoiceRepository;
import com.recoverpro.server.repository.RefundRepository;
import com.recoverpro.server.service.AuditEventRequest;
import com.recoverpro.server.service.AuditService;
import com.recoverpro.server.service.PaymentProviderResolver;
import com.recoverpro.server.service.RefundResult;
import com.recoverpro.server.service.RefundService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefundServiceImpl implements RefundService {

    private final PlatformInvoiceRepository invoiceRepository;
    private final RefundRepository refundRepository;
    private final PaymentProviderResolver paymentProviderResolver;
    private final AuditService auditService;

    @Override
    @Transactional
    public Refund initiateRefund(UUID invoiceId, Long amountMinorUnits, String reason, UUID initiatedByUserId) {
        if (amountMinorUnits == null || amountMinorUnits <= 0) {
            throw new BusinessException("Refund amount must be greater than zero");
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("A refund requires a stated reason");
        }

        PlatformInvoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        if (invoice.getProviderPaymentRef() == null) {
            throw new BusinessException(
                    "Invoice " + invoiceId + " has no payment reference yet -- it may not be paid, "
                            + "or predates provider-payment-ref tracking. Cannot refund.");
        }

        // Prevent a second refund attempt while one is still in flight, and cap against what's
        // actually left to refund -- both checked here, not left for the provider to catch.
        if (!refundRepository.findByInvoiceIdAndStatus(invoiceId, RefundStatus.PENDING).isEmpty()) {
            throw new BusinessException("A refund is already pending for invoice " + invoiceId);
        }
        long alreadyRefunded = refundRepository.findByInvoiceIdAndStatus(invoiceId, RefundStatus.SUCCEEDED)
                .stream().mapToLong(Refund::getAmountMinorUnits).sum();
        long refundable = invoice.getAmountPaid() - alreadyRefunded;
        if (amountMinorUnits > refundable) {
            throw new BusinessException("Refund amount " + amountMinorUnits
                    + " exceeds refundable balance " + refundable + " for invoice " + invoiceId);
        }

        // Provider call happens before the local row is written: if this throws, no Refund row
        // is created at all, and the caller can safely retry. The narrow gap this doesn't cover
        // -- provider succeeds but the DB write after it fails -- isn't solved here (would need
        // an outbox/saga); acceptable at RecoverPro's current refund volume, not the common case.
        RefundResult result = paymentProviderResolver.resolveForOrg(invoice.getOrgId())
                .refundPayment(invoice.getProviderPaymentRef(), amountMinorUnits, reason);

        RefundStatus status = result.succeeded()
                ? RefundStatus.SUCCEEDED
                : ("failed".equalsIgnoreCase(result.status()) ? RefundStatus.FAILED : RefundStatus.PENDING);

        Refund refund = refundRepository.save(Refund.builder()
                .invoiceId(invoiceId)
                .amountMinorUnits(amountMinorUnits)
                .reason(reason)
                .initiatedByUserId(initiatedByUserId)
                .providerRefundId(result.providerRefundId())
                .status(status)
                .build());

        auditService.record(AuditEventRequest.builder()
                .action(AuditAction.REFUND_CREATED)
                .resourceType(AuditResourceType.INVOICE)
                .resourceId(invoiceId.toString())
                .reason(reason)
                .organizationIdOverride(invoice.getOrgId())
                .metadata(Map.of(
                        "amountMinorUnits", String.valueOf(amountMinorUnits),
                        "status", status.name(),
                        "providerRefundId", String.valueOf(result.providerRefundId())))
                .build());

        log.info("Refund {} for invoice {}: amount={}, status={}, by={}",
                refund.getId(), invoiceId, amountMinorUnits, status, initiatedByUserId);
        return refund;
    }
}
