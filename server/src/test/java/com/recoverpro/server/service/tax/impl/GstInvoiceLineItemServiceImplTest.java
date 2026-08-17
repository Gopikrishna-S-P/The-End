package com.recoverpro.server.service.tax.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.config.GstConfig;
import com.recoverpro.server.entity.InvoiceLineItem;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.PlatformInvoice;
import com.recoverpro.server.repository.InvoiceLineItemRepository;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.PlatformInvoiceRepository;
import com.recoverpro.server.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GstInvoiceLineItemServiceImplTest {

    @Mock private PlatformInvoiceRepository invoiceRepository;
    @Mock private OrgSubscriptionRepository subRepo;
    @Mock private InvoiceLineItemRepository lineItemRepository;
    @Mock private AuditService auditService;

    private GstConfig gstConfig;
    private GstInvoiceLineItemServiceImpl service;
    private UUID invoiceId;
    private UUID orgId;
    private UUID actorId;

    @BeforeEach
    void setUp() throws Exception {
        gstConfig = new GstConfig();
        setField(gstConfig, "supplierGstin", "27AAAPL1234C1Z5");
        setField(gstConfig, "supplierStateCode", "27");
        setField(gstConfig, "defaultRateBps", 1800);

        service = new GstInvoiceLineItemServiceImpl(invoiceRepository, subRepo, lineItemRepository, gstConfig, auditService);
        invoiceId = UUID.randomUUID();
        orgId = UUID.randomUUID();
        actorId = UUID.randomUUID();
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(target, value);
    }

    private PlatformInvoice invoice() {
        return PlatformInvoice.builder().id(invoiceId).orgId(orgId).currency("inr").build();
    }

    @Test
    void generate_sameStateOrg_producesCgstSgstSplitAndAudits() {
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice()));
        OrgSubscription sub = OrgSubscription.builder().orgId(orgId).gstin("27AAAPL1234C1Z5").build();
        when(subRepo.findByOrgId(orgId)).thenReturn(Optional.of(sub));
        when(lineItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InvoiceLineItem result = service.generate(invoiceId, "GROWTH plan, monthly", 10_000L, actorId);

        assertThat(result.getCgstAmount()).isEqualTo(900L);
        assertThat(result.getSgstAmount()).isEqualTo(900L);
        assertThat(result.getIgstAmount()).isEqualTo(0L);
        assertThat(result.getLineTotal()).isEqualTo(11_800L);
        assertThat(result.getPlaceOfSupplyStateCode()).isEqualTo("27");
        assertThat(result.getCurrency()).isEqualTo("inr");
        verify(auditService).record(any());
    }

    @Test
    void generate_differentStateOrg_producesIgstOnly() {
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice()));
        OrgSubscription sub = OrgSubscription.builder().orgId(orgId).gstin("07AAAPL1234C1Z5").build();
        when(subRepo.findByOrgId(orgId)).thenReturn(Optional.of(sub));
        when(lineItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InvoiceLineItem result = service.generate(invoiceId, "GROWTH plan, monthly", 10_000L, actorId);

        assertThat(result.getIgstAmount()).isEqualTo(1800L);
        assertThat(result.getCgstAmount()).isEqualTo(0L);
        assertThat(result.getSgstAmount()).isEqualTo(0L);
    }

    @Test
    void generate_orgHasNoGstin_throwsBusinessException() {
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice()));
        OrgSubscription sub = OrgSubscription.builder().orgId(orgId).gstin(null).build();
        when(subRepo.findByOrgId(orgId)).thenReturn(Optional.of(sub));

        assertThatThrownBy(() -> service.generate(invoiceId, "desc", 10_000L, actorId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("no valid GSTIN");
    }

    @Test
    void generate_supplierProfileNotConfigured_throwsBeforeAnyLookup() throws Exception {
        GstConfig unconfigured = new GstConfig();
        GstInvoiceLineItemServiceImpl unconfiguredService = new GstInvoiceLineItemServiceImpl(
                invoiceRepository, subRepo, lineItemRepository, unconfigured, auditService);

        assertThatThrownBy(() -> unconfiguredService.generate(invoiceId, "desc", 10_000L, actorId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not configured");

        verify(invoiceRepository, org.mockito.Mockito.never()).findById(any());
    }

    @Test
    void generate_invoiceNotFound_throwsResourceNotFound() {
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generate(invoiceId, "desc", 10_000L, actorId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void generate_zeroOrNegativeAmount_throws() {
        assertThatThrownBy(() -> service.generate(invoiceId, "desc", 0L, actorId))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.generate(invoiceId, "desc", -1L, actorId))
                .isInstanceOf(BusinessException.class);
    }
}
