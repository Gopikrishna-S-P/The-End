package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CallerSection {

    private long casesAssignedToday;
    private long callsCompletedToday;
    private long callsPendingToday;
    private long ptpsMadeToday;
    private BigDecimal amountCommittedToday;
}
