package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
public class CreateSettlementOfferRequest {

    @NotNull
    private UUID allocationId;

    @NotNull
    @Positive
    private BigDecimal offeredAmount;

    @NotNull
    @Positive
    private Integer tenorDays;

    @NotNull
    @Future
    private Instant validityUntil;

    @Size(max = 2000)
    private String conditions;
}
