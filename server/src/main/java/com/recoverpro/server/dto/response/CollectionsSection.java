package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CollectionsSection {
    private BigDecimal collectionVolumeThisMonth;
    private long collectionCountThisMonth;
    private BigDecimal collectionVolumeLastMonth;
    private BigDecimal growthRate;
    private List<TrendPoint> monthlyTrend;
    private List<TrendPoint> ptpMonthlyTrend;
    private List<TrendPoint> visitMonthlyTrend;
    /** Top collectors this month, highest amount first. */
    private List<TopAgentPoint> topAgents;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TopAgentPoint {
        private String name;
        private BigDecimal amount;
        private long count;
    }
}
