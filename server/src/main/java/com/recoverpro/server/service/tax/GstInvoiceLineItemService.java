package com.recoverpro.server.service.tax;

import com.recoverpro.server.entity.InvoiceLineItem;

import java.util.UUID;

/**
 * Computes and persists a GST-compliant {@link InvoiceLineItem} for an invoice, on explicit
 * platform-admin request -- not wired automatically into the Stripe/Razorpay webhook flow.
 * <p>
 * Why not automatic: correctly deriving "taxable amount before tax" from a provider invoice total
 * requires knowing whether that provider is already handling Indian tax collection on the
 * account (e.g. Stripe Tax), which this codebase has no evidence of one way or the other -- an
 * automatic webhook handler that assumed either answer could silently double-tax or under-tax a
 * real invoice. An explicit admin action, given the taxable amount directly, avoids guessing.
 */
public interface GstInvoiceLineItemService {

    InvoiceLineItem generate(UUID invoiceId, String description, long taxableAmountMinorUnits, UUID actingUserId);
}
