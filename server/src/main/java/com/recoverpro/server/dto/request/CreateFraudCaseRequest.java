package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.FraudCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateFraudCaseRequest {

    @NotNull
    private UUID organizationId;

    private UUID allocationId;
    private UUID borrowerId;

    @NotNull
    private FraudCategory category;

    private BigDecimal amountInvolved;
    private LocalDate incidentDate;

    @NotBlank
    private String description;

    private String evidenceUrl;
}
