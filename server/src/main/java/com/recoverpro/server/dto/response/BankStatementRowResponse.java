package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.ReconciliationOutcome;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class BankStatementRowResponse {
    private UUID id;
    private UUID runId;
    private String utr;
    private String txnRef;
    private BigDecimal amount;
    private String currency;
    private LocalDate valueDate;
    private String narration;
    private String sourceRowId;
    private ReconciliationOutcome outcome;
    private UUID matchedPaymentTxnId;
    private String matchNotes;
    private Instant createdAt;
}
