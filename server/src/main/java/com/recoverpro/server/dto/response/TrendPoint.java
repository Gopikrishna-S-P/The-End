package com.recoverpro.server.dto.response;
import lombok.*;
import java.math.BigDecimal;

/** Type alias for monthly/weekly trend data point -- used by dashboard builders. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TrendPoint {
    private int year;
    private int month;
    private String label;
    private BigDecimal totalAmount;
    private long totalCount;
}
