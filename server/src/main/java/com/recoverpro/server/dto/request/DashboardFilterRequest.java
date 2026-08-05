package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardFilterRequest {
    @Min(1) @Max(24)
    private int trendMonths = 6;
    @Min(3) @Max(50)
    private int leaderboardSize = 10;
}