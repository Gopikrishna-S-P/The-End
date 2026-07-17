package com.recoverpro.server.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PtpStatisticsResponse {

    private UUID agentId;
    private String agentName;
    private Long totalPtps;
    private Long pendingCount;
    private Long fulfilledCount;
    private Long partiallyFulfilledCount;
    private Long brokenCount;
    private Long cancelledCount;
    private BigDecimal totalPromisedAmount;
    private BigDecimal totalCollectedAmount;
    private BigDecimal fulfillmentRate;
    private BigDecimal collectionEfficiency;
}
