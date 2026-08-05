package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class OptimizedAssignmentOrderResponse {

    private UUID organizationId;
    private UUID agentId;
    private String modelVersion;
    private List<OrderedAllocation> ordered;

    @Data
    @Builder
    public static class OrderedAllocation {
        private UUID allocationId;
        private int sequenceOrder;
        private BigDecimal score;
        private String rationale;
        private String segment;
    }
}
