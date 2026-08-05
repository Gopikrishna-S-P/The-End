package com.recoverpro.server.dto.request;

import lombok.Data;

import java.util.UUID;

@Data
public class SettlementMarkPaidRequest {

    /** Reference to a real payment_intents row, if the payment went through that flow. */
    private UUID paymentIntentId;
}
