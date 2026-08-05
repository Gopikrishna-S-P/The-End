package com.recoverpro.server.enums;

public enum PaymentTransactionState {
    INITIATED,
    AUTHORIZED,
    CAPTURED,
    FAILED,
    REFUNDED,
    /** Returned/charged-back by the bank after settlement. */
    REVERSED
}
