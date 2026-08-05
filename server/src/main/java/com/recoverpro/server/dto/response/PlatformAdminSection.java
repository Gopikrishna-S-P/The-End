package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PlatformAdminSection {
    private long totalOrganizations;
    private long activeOrganizations;
    private long totalUsers;
    private long totalAllocations;
    private BigDecimal systemWideCollectionVolume;
    private BigDecimal collectionGrowthRate;
    private long totalCollectionsThisMonth;
    private BigDecimal collectionVolumeThisMonth;
    private BigDecimal collectionVolumeLastMonth;
    private List<TrendPoint> monthlyCollectionTrend;
    private List<OrganizationSummaryResponse> topOrgsByCollection;
}
