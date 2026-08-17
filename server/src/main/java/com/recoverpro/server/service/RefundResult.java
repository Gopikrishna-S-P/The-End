package com.recoverpro.server.service;

/** Result of a {@link PaymentProvider#refundPayment} call. */
public record RefundResult(String providerRefundId, boolean succeeded, String status) {
}
