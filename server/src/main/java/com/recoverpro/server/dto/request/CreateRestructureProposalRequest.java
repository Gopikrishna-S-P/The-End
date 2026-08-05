package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
public class CreateRestructureProposalRequest {

    @NotNull
    private UUID allocationId;

    @NotNull
    @Positive
    private Integer originalEmiCount;

    @NotNull
    @Positive
    private BigDecimal originalEmiAmount;

    @NotNull
    @PositiveOrZero
    private BigDecimal originalApr;

    @NotNull
    @Positive
    private Integer newEmiCount;

    @NotNull
    @Positive
    private BigDecimal newEmiAmount;

    @NotNull
    @PositiveOrZero
    private BigDecimal newApr;

    private List<Map<String, Object>> stepSchedule;

    @Size(max = 2000)
    private String rationale;
}
