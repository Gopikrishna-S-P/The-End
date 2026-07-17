package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
public class CreatePaymentIntentRequest {

    @NotNull
    private UUID organizationId;

    @NotNull
    private UUID allocationId;

    private UUID borrowerId;

    @NotNull
    @DecimalMin(value = "1.00")
    private BigDecimal amount;

    @Size(max = 200)
    private String purpose;

    private Instant expiresAt;
}
