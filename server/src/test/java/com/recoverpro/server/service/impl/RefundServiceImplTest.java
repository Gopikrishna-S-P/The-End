package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.entity.PlatformInvoice;
import com.recoverpro.server.entity.Refund;
import com.recoverpro.server.enums.RefundStatus;
import com.recoverpro.server.repository.PlatformInvoiceRepository;
import com.recoverpro.server.repository.RefundRepository;
import com.recoverpro.server.service.AuditService;
import com.recoverpro.server.service.PaymentProvider;
import com.recoverpro.server.service.PaymentProviderResolver;
import com.recoverpro.server.service.RefundResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefundServiceImplTest {

    @Mock private PlatformInvoiceRepository invoiceRepository;
    @Mock private RefundRepository refundRepository;
    @Mock private PaymentProviderResolver paymentProviderResolver;
    @Mock private PaymentProvider paymentProvider;
    @Mock private AuditService auditService;

    private RefundServiceImpl service;
    private UUID invoiceId;
    private UUID orgId;
    private UUID actorId;

    @BeforeEach
    void setUp() {
        service = new RefundServiceImpl(invoiceRepository, refundRepository, paymentProviderResolver, auditService);
        invoiceId = UUID.randomUUID();
        orgId = UUID.randomUUID();
        actorId = UUID.randomUUID();
        lenient().when(paymentProviderResolver.resolveForOrg(orgId)).thenReturn(paymentProvider);
    }

    private PlatformInvoice paidInvoice(long amountPaid) {
        return PlatformInvoice.builder()
                .id(invoiceId)
                .orgId(orgId)
                .amountPaid(amountPaid)
                .providerPaymentRef("pi_123")
                .build();
    }

    @Test
    void initiateRefund_withinRefundableBalance_succeedsAndAudits() {
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(paidInvoice(10_000L)));
        when(refundRepository.findByInvoiceIdAndStatus(invoiceId, RefundStatus.PENDING)).thenReturn(List.of());
        when(refundRepository.findByInvoiceIdAndStatus(invoiceId, RefundStatus.SUCCEEDED)).thenReturn(List.of());
        when(paymentProvider.refundPayment(eq("pi_123"), eq(5_000L), anyString()))
                .thenReturn(new RefundResult("re_123", true, "succeeded"));
        when(refundRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Refund result = service.initiateRefund(invoiceId, 5_000L, "billing correction", actorId);

        assertThat(result.getStatus()).isEqualTo(RefundStatus.SUCCEEDED);
        assertThat(result.getProviderRefundId()).isEqualTo("re_123");
        verify(auditService).record(any());
    }

    @Test
    void initiateRefund_amountExceedsRefundableBalance_throwsAndNeverCallsProvider() {
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(paidInvoice(10_000L)));
        when(refundRepository.findByInvoiceIdAndStatus(invoiceId, RefundStatus.PENDING)).thenReturn(List.of());
        when(refundRepository.findByInvoiceIdAndStatus(invoiceId, RefundStatus.SUCCEEDED)).thenReturn(
                List.of(Refund.builder().amountMinorUnits(8_000L).build()));

        assertThatThrownBy(() -> service.initiateRefund(invoiceId, 5_000L, "over the top", actorId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("exceeds refundable balance");

        verify(paymentProvider, never()).refundPayment(anyString(), anyLong(), anyString());
        verify(refundRepository, never()).save(any());
    }

    @Test
    void initiateRefund_pendingRefundAlreadyInFlight_throwsAndNeverCallsProvider() {
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(paidInvoice(10_000L)));
        when(refundRepository.findByInvoiceIdAndStatus(invoiceId, RefundStatus.PENDING))
                .thenReturn(List.of(Refund.builder().status(RefundStatus.PENDING).build()));

        assertThatThrownBy(() -> service.initiateRefund(invoiceId, 1_000L, "duplicate attempt", actorId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already pending");

        verify(paymentProvider, never()).refundPayment(anyString(), anyLong(), anyString());
    }

    @Test
    void initiateRefund_invoiceHasNoProviderPaymentRef_throwsAndNeverCallsProvider() {
        PlatformInvoice unpaid = PlatformInvoice.builder()
                .id(invoiceId).orgId(orgId).amountPaid(0L).providerPaymentRef(null).build();
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(unpaid));

        assertThatThrownBy(() -> service.initiateRefund(invoiceId, 1_000L, "too early", actorId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("no payment reference");

        verify(paymentProvider, never()).refundPayment(anyString(), anyLong(), anyString());
    }

    @Test
    void initiateRefund_blankReason_throwsBeforeTouchingInvoiceLookup() {
        assertThatThrownBy(() -> service.initiateRefund(invoiceId, 1_000L, "  ", actorId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("reason");
        verify(invoiceRepository, never()).findById(any());
    }
}
