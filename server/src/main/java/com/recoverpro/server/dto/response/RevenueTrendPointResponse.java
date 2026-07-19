package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

/** Matches web/src/api/platformApi.ts's RevenueTrendPoint exactly: { month, revenue, count }. */
@Data
@Builder
public class RevenueTrendPointResponse {
    private String month;
    private long revenue;
    private long count;
}
