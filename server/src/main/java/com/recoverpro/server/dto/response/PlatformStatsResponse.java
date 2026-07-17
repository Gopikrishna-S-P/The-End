package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlatformStatsResponse {

    private long totalOrgs;
    private long activeOrgs;
    private long inactiveOrgs;
    private long newOrgsThisMonth;

    private long totalUsers;

    private RoleBreakdown roleBreakdown;

    private long totalAllocations;
    private long totalUploads;
    private long totalRowsProcessed;
    private long uploadsLast7Days;

    private long pendingUserRequests;
    private long staleOrgs;

    @Data
    @Builder
    public static class RoleBreakdown {
        private long orgAdmin;
        private long manager;
        private long tl;
        private long fo;
        private long caller;
        private long tracer;
    }
}
