package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrgTodaySection {

    // Collections
    private BigDecimal collectedToday;
    private BigDecimal collectedYesterday;

    // Visits / dispatch
    private long visitsTotalToday;
    private long visitsCompletedToday;
    private long visitsInProgressToday;
    private long visitsPendingToday;

    // Field officers
    private long fosTotalCount;
    private long fosActiveToday;
    private long fosIdleToday;

    // PTPs due today
    private long ptpsDueToday;
    private BigDecimal ptpAmountDueToday;
}
