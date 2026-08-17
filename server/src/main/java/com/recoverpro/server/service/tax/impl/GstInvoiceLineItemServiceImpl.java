package com.recoverpro.server.service.tax.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.config.GstConfig;
import com.recoverpro.server.entity.InvoiceLineItem;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.PlatformInvoice;
import com.recoverpro.server.enums.AuditAction;
import com.recoverpro.server.enums.AuditResourceType;
import com.recoverpro.server.repository.InvoiceLineItemRepository;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.PlatformInvoiceRepository;
import com.recoverpro.server.service.AuditEventRequest;
import com.recoverpro.server.service.AuditService;
import com.recoverpro.server.service.tax.GstBreakdown;
import com.recoverpro.server.service.tax.GstCalculator;
import com.recoverpro.server.service.tax.Gstin;
import com.recoverpro.server.service.tax.GstInvoiceLineItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GstInvoiceLineItemServiceImpl implements GstInvoiceLineItemService {

    private final PlatformInvoiceRepository invoiceRepository;
    private final OrgSubscriptionRepository subRepo;
    private final InvoiceLineItemRepository lineItemRepository;
    private final GstConfig gstConfig;
    private final AuditService auditService;

    @Override
    @Transactional
    public InvoiceLineItem generate(UUID invoiceId, String description, long taxableAmountMinorUnits,
                                    UUID actingUserId) {
        if (taxableAmountMinorUnits <= 0) {
            throw new BusinessException("Taxable amount must be greater than zero");
        }
        if (!gstConfig.isConfigured()) {
            throw new BusinessException(
                    "GST supplier profile is not configured (app.gst.supplier-gstin). "
                            + "Cannot compute GST until RecoverPro's own GSTIN is set.");
        }

        PlatformInvoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        OrgSubscription sub = subRepo.findByOrgId(invoice.getOrgId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No subscription/billing profile found for org: " + invoice.getOrgId()));

        if (!Gstin.isValid(sub.getGstin())) {
            throw new BusinessException(
                    "Organization " + invoice.getOrgId() + " has no valid GSTIN on file. "
                            + "A GST invoice line cannot be generated without one.");
        }

        String recipientStateCode = Gstin.stateCode(sub.getGstin());
        int rateBps = gstConfig.getDefaultRateBps();
        GstBreakdown breakdown = GstCalculator.compute(
                gstConfig.getSupplierStateCode(), recipientStateCode, taxableAmountMinorUnits, rateBps);

        InvoiceLineItem lineItem = lineItemRepository.save(InvoiceLineItem.builder()
                .invoiceId(invoiceId)
                .description(description)
                .quantity(1)
                .unitAmount(taxableAmountMinorUnits)
                .taxRateBps(rateBps)
                .cgstAmount(breakdown.cgst())
                .sgstAmount(breakdown.sgst())
                .igstAmount(breakdown.igst())
                .placeOfSupplyStateCode(recipientStateCode)
                .lineTotal(taxableAmountMinorUnits + breakdown.totalTax())
                .currency(invoice.getCurrency())
                .build());

        // REPORT_GENERATED reused rather than adding a new taxonomy entry -- this is a routine
        // financial-document generation action (same category as a report job), not a distinct
        // security-relevant event that warrants its own action.
        auditService.record(AuditEventRequest.builder()
                .action(AuditAction.REPORT_GENERATED)
                .resourceType(AuditResourceType.INVOICE)
                .resourceId(invoiceId.toString())
                .actorUserIdOverride(actingUserId)
                .organizationIdOverride(invoice.getOrgId())
                .metadata(Map.of(
                        "kind", "gst_line_item",
                        "taxableAmountMinorUnits", String.valueOf(taxableAmountMinorUnits),
                        "cgst", String.valueOf(breakdown.cgst()),
                        "sgst", String.valueOf(breakdown.sgst()),
                        "igst", String.valueOf(breakdown.igst()),
                        "rateBps", String.valueOf(rateBps)))
                .build());

        log.info("GST line item generated: invoice={}, org={}, taxable={}, cgst={}, sgst={}, igst={}",
                invoiceId, invoice.getOrgId(), taxableAmountMinorUnits,
                breakdown.cgst(), breakdown.sgst(), breakdown.igst());
        return lineItem;
    }
}
