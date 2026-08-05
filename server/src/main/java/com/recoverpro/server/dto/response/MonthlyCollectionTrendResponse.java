package com.recoverpro.server.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MonthlyCollectionTrendResponse {
    private int year;
    private int month;
    private String monthLabel;
    private BigDecimal totalAmount;
    private long totalCount;
    private BigDecimal growthRate;
}
