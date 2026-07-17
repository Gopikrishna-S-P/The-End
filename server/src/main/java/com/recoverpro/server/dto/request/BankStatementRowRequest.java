package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BankStatementRowRequest {

    @Size(max = 50)
    private String utr;

    @Size(max = 100)
    private String txnRef;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal amount;

    @NotNull
    private LocalDate valueDate;

    @Size(max = 500)
    private String narration;

    @Size(max = 200)
    private String sourceRowId;
}