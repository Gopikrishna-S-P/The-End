package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.PaymentMode;
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
public class SubmitCollectionRequest {

    @NotNull
    private UUID allocationId;

    @NotNull
    private UUID organizationId;

    @NotNull
    @DecimalMin(value = "0.01")
    @Digits(integer = 13, fraction = 2)
    private BigDecimal amount;

    @NotNull
    private PaymentMode paymentMode;

    @NotNull
    @PastOrPresent
    private LocalDate collectionDate;

    @Size(max = 2000)
    private String notes;

    @NotBlank
    @Size(min = 16, max = 64)
    private String idempotencyKey;

    @NotNull
    private UUID visitId;

    @Size(max = 30)
    private String chequeNumber;

    private LocalDate chequeDate;

    @Size(max = 100)
    private String bankName;

    @Size(max = 50)
    private String upiReferenceId;

    @Size(max = 50)
    private String transactionReferenceId;

    @Builder.Default
    private boolean cashHandlingAcknowledged = false;
}
