package com.recoverpro.server.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyLoanBookResponse {

    private UUID organizationId;
    private LocalDate snapshotMonth;
    private Integer totalLoans;
    private BigDecimal totalOutstandingAmount;
    private BigDecimal totalCollectedAmount;
    private Integer totalNpaCount;
    private BigDecimal totalNpaAmount;
    private Integer totalAssignedLoans;
    private Integer totalUnassignedLoans;
    private BigDecimal collectionEfficiencyPct;
    private BigDecimal recoveryRatePct;
}
