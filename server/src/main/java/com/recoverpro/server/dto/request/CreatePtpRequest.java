package com.recoverpro.server.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreatePtpRequest {

    @NotNull(message = "Allocation ID is required")
    private UUID allocationId;

    @NotNull(message = "Agent ID is required")
    private UUID agentId;

    @NotBlank(message = "Agent name is required")
    @Size(max = 255)
    private String agentName;

    @NotBlank(message = "Loan number is required")
    @Size(max = 100)
    private String loanNumber;

    @NotBlank(message = "Borrower name is required")
    @Size(max = 255)
    private String borrowerName;

    @NotNull(message = "Promised date is required")
    @Future(message = "Promised date must be a future date")
    private LocalDate promisedDate;

    @NotNull(message = "Promised amount is required")
    @DecimalMin(value = "0.01")
    @Digits(integer = 13, fraction = 2)
    private BigDecimal promisedAmount;

    @Size(max = 2000)
    private String contactNotes;

    private UUID visitId;
}
