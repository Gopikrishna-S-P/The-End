package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.PaymentMode;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AgentCollectionReport {

    private UUID agentId;
    private LocalDate reportDate;
    private boolean isDailyReport;

    private int totalSubmissions;
    private int totalApproved;
    private int totalRejected;
    private int totalDeposited;
    private int totalPending;

    private BigDecimal totalAmountSubmitted;
    private BigDecimal totalAmountApproved;
    private BigDecimal totalAmountDeposited;

    private Map<PaymentMode, Integer> countByPaymentMode;
    private Map<PaymentMode, BigDecimal> amountByPaymentMode;
    private Map<CollectionStatus, Integer> countByStatus;
}
