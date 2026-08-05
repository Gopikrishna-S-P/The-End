package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.DashboardRole;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UnifiedDashboardResponse {

    private DashboardRole role;
    private UUID organizationId;
    private Instant generatedAt;

    private PlatformAdminSection platform;
    private OrgOverviewSection orgOverview;
    private OrgTodaySection orgToday;
    private AllocationsSection allocations;
    private CollectionsSection collections;
    private PtpSummarySection ptpSummary;
    private TeamSection team;
    private CallerSection callerToday;
}
