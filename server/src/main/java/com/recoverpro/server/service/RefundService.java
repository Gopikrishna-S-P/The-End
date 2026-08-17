package com.recoverpro.server.service;

import com.recoverpro.server.entity.Refund;

import java.util.UUID;

/**
 * Orchestrates a refund: validates the amount against the invoice's remaining refundable
 * balance, calls through {@link PaymentProvider}, records the result. Amount validation happens
 * here (application layer), not left to the provider to catch (Billing Ledger design doc §10).
 */
public interface RefundService {

    Refund initiateRefund(UUID invoiceId, Long amountMinorUnits, String reason, UUID initiatedByUserId);
}
