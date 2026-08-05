package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.NpaRiskLevel;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class BankReconciliationResponse {
    private UUID organizationId;
    private int month;
    private int year;
    private LocalDate generatedOn;

    private BigDecimal totalCollectedCash;
    private BigDecimal totalCollectedUpi;
    private BigDecimal totalCollectedCheque;
    private BigDecimal totalCollectedNeft;
    private BigDecimal totalCollectedRtgs;
    private BigDecimal grandTotalCollected;

    private int totalApprovedTransactions;
    private int totalDepositedTransactions;
    private int totalPendingDeposit;
    private BigDecimal totalDepositedAmount;
    private BigDecimal totalPendingDepositAmount;

    private Map<NpaRiskLevel, Integer> npaBreakdown;
    private BigDecimal totalNpaAmount;

    private List<ReconciliationRow> rows;

    @Data
    @Builder
    public static class ReconciliationRow {
        private UUID collectionId;
        private String receiptNumber;
        private String loanNumber;
        private String borrowerName;
        private BigDecimal amount;
        private String paymentMode;
        private String status;
        private LocalDate collectionDate;
        private LocalDate depositedDate;
        private UUID agentId;
    }
}
