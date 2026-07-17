package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.PtpStatus;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePtpStatusRequest {

    @NotNull(message = "New status is required")
    private PtpStatus newStatus;

    @DecimalMin(value = "0.00")
    @Digits(integer = 13, fraction = 2)
    private BigDecimal collectedAmount;

    @Size(max = 2000)
    private String reason;
}
