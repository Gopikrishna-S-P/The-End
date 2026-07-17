package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RevenueTrendPoint {
    private String month;   // "Jan", "Feb", ...
    private long revenue;   // estimated INR
    private int count;      // active subscriptions activated that month
}
