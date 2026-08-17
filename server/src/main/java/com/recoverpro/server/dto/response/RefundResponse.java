package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class RefundResponse {
    private UUID id;
    private UUID invoiceId;
    private long amountMinorUnits;
    private String reason;
    private String status;
    private String providerRefundId;
}
