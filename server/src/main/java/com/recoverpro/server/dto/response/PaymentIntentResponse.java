package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.PaymentIntentStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PaymentIntentResponse {
    private UUID id;
    private UUID organizationId;
    private UUID allocationId;
    private UUID borrowerId;
    private BigDecimal amount;
    private String currency;
    private String purpose;
    private PaymentIntentStatus status;
    private Instant expiresAt;
    private String idempotencyKey;
    private Instant createdAt;
}
