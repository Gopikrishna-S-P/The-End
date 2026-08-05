package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.OrganizationSummaryResponse;
import com.recoverpro.server.dto.response.PlatformAdminSection;
import com.recoverpro.server.dto.response.TrendPoint;
import com.recoverpro.server.entity.MonthlyLoanBookSnapshot;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.MonthlyLoanBookSnapshotRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.DashboardCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Cross-tenant platform-admin dashboard section (SYSTEM-PLAN SP40 -- split out of the 418-line
 * UnifiedDashboardBuilder, which mixed this with per-org sections).
 *
 * Trends → monthly_loan_book_snapshots aggregated across all orgs (pre-aggregated nightly).
 * NEVER query raw collection/visit rows for dashboard aggregates.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PlatformDashboardBuilder {

    private final OrganizationRepository orgRepo;
    private final UserRepository userRepo;
    private final AllocationRepository allocationRepo;
    private final MonthlyLoanBookSnapshotRepository loanBookSnapshotRepo;
    private final DashboardCacheService cache;

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    public PlatformAdminSection buildPlatformSection(int trendMonths) {
        return cache.getOrCompute(
                DashboardCacheService.platformKey(),
                DashboardCacheService.PLATFORM_TTL,
                () -> computePlatformSection(trendMonths),
                PlatformAdminSection.class);
    }

    private PlatformAdminSection computePlatformSection(int trendMonths) {
        long totalOrgs  = orgRepo.countTenantOrgs();
        long activeOrgs = orgRepo.countActiveTenantOrgs();
        long totalUsers = userRepo.count();
        long totalAlloc = allocationRepo.countByIsDeletedFalse();

        // Aggregate monthly totals across all org snapshots for the past N months
        LocalDate fromMonth = LocalDate.now().minusMonths(trendMonths).withDayOfMonth(1);
        List<MonthlyLoanBookSnapshot> allSnapshots = loanBookSnapshotRepo
                .findAll()
                .stream()
                .filter(s -> !s.getSnapshotMonth().isBefore(fromMonth))
                .toList();

        // Group by month, sum across orgs
        Map<String, BigDecimal> volByMonth = allSnapshots.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getSnapshotMonth().format(MONTH_FMT),
                        Collectors.reducing(BigDecimal.ZERO,
                                MonthlyLoanBookSnapshot::getTotalCollectedAmount,
                                BigDecimal::add)));
        Map<String, Long> cntByMonth = allSnapshots.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getSnapshotMonth().format(MONTH_FMT),
                        Collectors.summingLong(s -> s.getTotalLoans())));

        List<TrendPoint> trend = volByMonth.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByKey().reversed())
                .map(e -> {
                    String[] parts = e.getKey().split("-");
                    int y = parts.length > 0 ? Integer.parseInt(parts[0]) : 0;
                    int m = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
                    return TrendPoint.builder()
                            .year(y).month(m).label(e.getKey())
                            .totalAmount(e.getValue())
                            .totalCount(cntByMonth.getOrDefault(e.getKey(), 0L))
                            .build();
                })
                .collect(Collectors.toList());

        BigDecimal systemVol    = trend.stream().map(TrendPoint::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal volThisMonth = trend.isEmpty() ? BigDecimal.ZERO : trend.get(0).getTotalAmount();
        BigDecimal volLastMonth = trend.size() > 1 ? trend.get(1).getTotalAmount() : BigDecimal.ZERO;
        long colThisMonth       = trend.isEmpty() ? 0L : trend.get(0).getTotalCount();

        BigDecimal growthRate = BigDecimal.ZERO;
        if (volLastMonth.compareTo(BigDecimal.ZERO) > 0) {
            growthRate = volThisMonth.subtract(volLastMonth)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(volLastMonth, 2, RoundingMode.HALF_UP);
        }

        // Top orgs by this-month snapshot collection volume
        String thisMonth = LocalDate.now().withDayOfMonth(1).format(MONTH_FMT);
        List<OrganizationSummaryResponse> topOrgs = allSnapshots.stream()
                .filter(s -> s.getSnapshotMonth().format(MONTH_FMT).equals(thisMonth))
                .sorted((a, b) -> b.getTotalCollectedAmount().compareTo(a.getTotalCollectedAmount()))
                .limit(10)
                .map(s -> {
                    Organization org = orgRepo.findById(s.getOrganizationId()).orElse(null);
                    return OrganizationSummaryResponse.builder()
                            .id(s.getOrganizationId())
                            .name(org != null ? org.getName() : "")
                            .code(org != null ? org.getCode() : "")
                            .build();
                })
                .collect(Collectors.toList());

        return PlatformAdminSection.builder()
                .totalOrganizations(totalOrgs)
                .activeOrganizations(activeOrgs)
                .totalUsers(totalUsers)
                .totalAllocations(totalAlloc)
                .systemWideCollectionVolume(systemVol)
                .collectionGrowthRate(growthRate)
                .totalCollectionsThisMonth(colThisMonth)
                .collectionVolumeThisMonth(volThisMonth)
                .collectionVolumeLastMonth(volLastMonth)
                .monthlyCollectionTrend(trend)
                .topOrgsByCollection(topOrgs)
                .build();
    }
}
