package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PtpSummarySection {
    private long activePtps;
    private long brokenPtpsThisMonth;
    private long fulfilledPtpsThisMonth;
    private BigDecimal fulfillmentRatePct;
}
