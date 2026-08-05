package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.*;
import com.recoverpro.server.entity.MonthlyLoanBookSnapshot;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.mapper.DashboardMapper;
import com.recoverpro.server.repository.*;
import com.recoverpro.server.service.ActiveDatasetResolver;
import com.recoverpro.server.service.DashboardCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Per-tenant dashboard sections (SYSTEM-PLAN SP40 -- split out of the 418-line
 * UnifiedDashboardBuilder; {@link PlatformDashboardBuilder} holds the cross-tenant section).
 *
 * Data tiers:
 *   Real-time  → WebSocket (handled by LiveTrackWebSocketHandler, not this class)
 *   Today KPIs → Redis, 30s TTL per org (dash:today:{orgId})
 *   Trends     → monthly_loan_book_snapshots / agent_performance_snapshots (pre-aggregated nightly)
 *   Allocations→ allocations table (indexed, cheap reads)
 *
 * NEVER query raw collection/visit rows for dashboard aggregates.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrgDashboardBuilder {

    private final OrganizationRepository orgRepo;
    private final UserRepository userRepo;
    private final AllocationRepository allocationRepo;
    private final CollectionRepository collectionRepo;
    private final PtpRepository ptpRepo;
    private final VisitLogRepository visitLogRepo;
    private final DailyVisitListRepository dailyVisitListRepo;
    private final MonthlyLoanBookSnapshotRepository loanBookSnapshotRepo;
    private final AgentPerformanceSnapshotRepository agentSnapshotRepo;
    private final DashboardMapper mapper;
    private final ActiveDatasetResolver activeDatasetResolver;
    private final DashboardCacheService cache;

    private static final UUID NO_ACTIVE_DATASET =
            UUID.fromString("00000000-0000-0000-0000-000000000000");
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    // ─── Org Overview (snapshot data + org metadata) ──────────────────────────

    public OrgOverviewSection buildOrgOverview(UUID orgId) {
        Organization org = orgRepo.findById(orgId).orElse(null);
        if (org == null) {
            log.warn("Dashboard: org {} not found", orgId);
            return OrgOverviewSection.builder().organizationId(orgId).build();
        }

        UUID fileId = activeFileId(orgId);
        long totalAlloc  = allocationRepo.countByOrgIdAndFile(orgId, fileId);
        long assigned    = allocationRepo.countByOrgIdAndStatusAndFile(orgId, AllocationStatus.ASSIGNED, fileId);
        long unassigned  = allocationRepo.countByOrgIdAndStatusAndFile(orgId, AllocationStatus.UNASSIGNED, fileId);
        long totalUsers  = userRepo.countByOrganizationId(orgId);

        // This month's volume from snapshot (not raw collection table)
        LocalDate thisMonth = LocalDate.now().withDayOfMonth(1);
        MonthlyLoanBookSnapshot snap = loanBookSnapshotRepo
                .findByOrganizationIdAndSnapshotMonth(orgId, thisMonth).orElse(null);
        BigDecimal volThisMonth    = snap != null ? snap.getTotalCollectedAmount() : BigDecimal.ZERO;
        long       colThisMonth    = snap != null ? snap.getTotalLoans() : 0L;
        BigDecimal outstandingTotal = mapper.safeDecimal(
                allocationRepo.sumOutstandingByOrgIdAndFile(orgId, fileId));

        return OrgOverviewSection.builder()
                .organizationId(orgId)
                .organizationName(org.getName())
                .organizationCode(org.getCode())
                .totalAllocations(totalAlloc)
                .assignedAllocations(assigned)
                .unassignedAllocations(unassigned)
                .totalUsers(totalUsers)
                .collectionVolumeThisMonth(volThisMonth)
                .collectionsThisMonth(colThisMonth)
                .outstandingTotal(outstandingTotal)
                .build();
    }

    // ─── Allocations (allocation table, indexed reads) ────────────────────────

    public AllocationsSection buildAllocations(UUID orgId) {
        UUID fileId     = activeFileId(orgId);
        long total      = allocationRepo.countByOrgIdAndFile(orgId, fileId);
        long assigned   = allocationRepo.countByOrgIdAndStatusAndFile(orgId, AllocationStatus.ASSIGNED, fileId);
        long unassigned = allocationRepo.countByOrgIdAndStatusAndFile(orgId, AllocationStatus.UNASSIGNED, fileId);
        long npa        = allocationRepo.countNpaByOrgIdAndFile(orgId, fileId);

        Instant now = Instant.now();
        Map<String, Long> raw = allocationRepo.findCaseAgeBucketsByFile(
                        orgId, fileId,
                        now.minus(30, ChronoUnit.DAYS),
                        now.minus(60, ChronoUnit.DAYS),
                        now.minus(90, ChronoUnit.DAYS))
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> ((Number) row[1]).longValue()));

        List<AllocationsSection.CaseAgeBucket> buckets = List.of("0-30d", "30-60d", "60-90d", "90d+")
                .stream()
                .map(lbl -> AllocationsSection.CaseAgeBucket.builder()
                        .label(lbl).count(raw.getOrDefault(lbl, 0L)).build())
                .collect(Collectors.toList());

        return AllocationsSection.builder()
                .totalAllocations(total)
                .assignedCount(assigned)
                .unassignedCount(unassigned)
                .npaFlaggedCount(npa)
                .caseAgeBuckets(buckets)
                .build();
    }

    // ─── Collections (trends from snapshot tables) ────────────────────────────

    public CollectionsSection buildCollections(UUID orgId, int trendMonths) {
        // Today volume comes from the Redis-cached OrgTodaySection
        OrgTodaySection today = buildOrgToday(orgId);

        // Trends: read from monthly_loan_book_snapshots, NOT raw collection table
        LocalDate fromMonth = LocalDate.now().minusMonths(trendMonths).withDayOfMonth(1);
        List<MonthlyLoanBookSnapshot> snapshots = loanBookSnapshotRepo
                .findByOrganizationIdOrderBySnapshotMonthDesc(orgId, PageRequest.of(0, trendMonths))
                .getContent();

        List<TrendPoint> trend = snapshots.stream()
                .map(s -> TrendPoint.builder()
                        .year(s.getSnapshotMonth().getYear())
                        .month(s.getSnapshotMonth().getMonthValue())
                        .label(s.getSnapshotMonth().format(MONTH_FMT))
                        .totalAmount(s.getTotalCollectedAmount())
                        .totalCount((long) s.getTotalLoans())
                        .build())
                .collect(Collectors.toList());

        BigDecimal volLastMonth = trend.size() > 1 ? trend.get(1).getTotalAmount() : BigDecimal.ZERO;
        BigDecimal growthRate   = BigDecimal.ZERO;
        if (volLastMonth.compareTo(BigDecimal.ZERO) > 0) {
            growthRate = today.getCollectedToday().subtract(volLastMonth)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(volLastMonth, 2, RoundingMode.HALF_UP);
        }

        // PTP + visit trends from pre-built repo queries (small indexed tables)
        List<TrendPoint> ptpTrend = mapper.toMonthlyTrendFromString(
                ptpRepo.findMonthlyTrendByOrg(orgId, fromMonth));
        List<TrendPoint> visitTrend = mapper.toCountMonthlyTrendFromString(
                visitLogRepo.findMonthlyTrendByOrg(orgId, fromMonth));

        // Top agents from agent_performance_snapshots this month (pre-aggregated)
        LocalDate snapshotDate = LocalDate.now().minusDays(1); // yesterday's snapshot
        List<CollectionsSection.TopAgentPoint> topAgents = agentSnapshotRepo
                .findAll()
                .stream()
                .filter(s -> orgId.equals(s.getOrganizationId())
                          && snapshotDate.equals(s.getSnapshotDate()))
                .sorted((a, b) -> b.getAmountCollected().compareTo(a.getAmountCollected()))
                .limit(5)
                .map(s -> {
                    User u = userRepo.findById(s.getAgentId()).orElse(null);
                    String name = u != null
                            ? (u.getFirstName() + " " + (u.getLastName() != null ? u.getLastName() : "")).trim()
                            : s.getAgentId().toString();
                    return CollectionsSection.TopAgentPoint.builder()
                            .name(name)
                            .amount(s.getAmountCollected())
                            .count((long) s.getTotalCollected())
                            .build();
                })
                .collect(Collectors.toList());

        return CollectionsSection.builder()
                .collectionVolumeThisMonth(today.getCollectedToday())
                .collectionCountThisMonth(today.getVisitsCompletedToday())
                .collectionVolumeLastMonth(volLastMonth)
                .growthRate(growthRate)
                .monthlyTrend(trend)
                .ptpMonthlyTrend(ptpTrend)
                .visitMonthlyTrend(visitTrend)
                .topAgents(topAgents)
                .build();
    }

    // ─── PTP Summary (PTP table — small, indexed) ─────────────────────────────

    public PtpSummarySection buildPtpSummary(UUID orgId) {
        LocalDate today      = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        long active    = ptpRepo.countPendingByOrg(orgId);
        long broken    = ptpRepo.countByOrgAndStatusAndDateRange(orgId, PtpStatus.BROKEN, monthStart, today);
        long fulfilled = ptpRepo.countByOrgAndStatusAndDateRange(orgId, PtpStatus.FULFILLED, monthStart, today);

        long totalResolved = broken + fulfilled;
        BigDecimal fulfillmentRate = totalResolved > 0
                ? BigDecimal.valueOf(fulfilled).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(totalResolved), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return PtpSummarySection.builder()
                .activePtps(active)
                .brokenPtpsThisMonth(broken)
                .fulfilledPtpsThisMonth(fulfilled)
                .fulfillmentRatePct(fulfillmentRate)
                .build();
    }

    // ─── Org Today KPIs (Redis, 30s TTL per org) ─────────────────────────────

    public OrgTodaySection buildOrgToday(UUID orgId) {
        return cache.getOrCompute(
                DashboardCacheService.todayKey(orgId),
                DashboardCacheService.TODAY_TTL,
                () -> computeOrgToday(orgId),
                OrgTodaySection.class);
    }

    private OrgTodaySection computeOrgToday(UUID orgId) {
        LocalDate today     = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        // These queries hit collection table, but only for today — small window
        BigDecimal collectedToday     = mapper.safeDecimal(
                collectionRepo.sumVolumeByOrgAndDateRange(orgId, today, today));
        BigDecimal collectedYesterday = mapper.safeDecimal(
                collectionRepo.sumVolumeByOrgAndDateRange(orgId, yesterday, yesterday));

        long visitsTotalToday     = dailyVisitListRepo.countByOrganizationIdAndDispatchDate(orgId, today);
        long visitsCompletedToday = visitLogRepo.countByOrganizationIdAndVisitDate(orgId, today);
        long fosTotalCount        = userRepo.countByOrganizationIdAndRoleName(orgId, "ROLE_FO");
        long fosActiveToday       = dailyVisitListRepo.countDistinctActiveAgentsByOrgAndDate(orgId, today);
        long ptpsDueToday         = ptpRepo.countByOrgAndStatusAndDateRange(
                orgId, PtpStatus.PENDING, today, today);
        BigDecimal ptpAmountDue   = mapper.safeDecimal(
                ptpRepo.sumPendingAmountByOrgAndDate(orgId, today));

        return OrgTodaySection.builder()
                .collectedToday(collectedToday)
                .collectedYesterday(collectedYesterday)
                .visitsTotalToday(visitsTotalToday)
                .visitsCompletedToday(visitsCompletedToday)
                .visitsInProgressToday(Math.max(0, visitsTotalToday - visitsCompletedToday))
                .visitsPendingToday(Math.max(0, visitsTotalToday - visitsCompletedToday))
                .fosTotalCount(fosTotalCount)
                .fosActiveToday(fosActiveToday)
                .fosIdleToday(Math.max(0, fosTotalCount - fosActiveToday))
                .ptpsDueToday(ptpsDueToday)
                .ptpAmountDueToday(ptpAmountDue)
                .build();
    }

    // ─── Caller Today ─────────────────────────────────────────────────────────

    public CallerSection buildCallerToday(UUID userId, UUID orgId) {
        LocalDate today = LocalDate.now();

        long casesAssigned  = collectionRepo.countByOrgAndDateRange(orgId, today, today);
        long callsCompleted = visitLogRepo.countByOrganizationIdAndVisitDate(orgId, today);
        long ptpsMade       = ptpRepo.countByAgentStatusAndDateRange(
                userId, PtpStatus.PENDING, today, today);
        BigDecimal committed = mapper.safeDecimal(
                ptpRepo.sumPendingAmountByOrgAndDate(orgId, today));

        return CallerSection.builder()
                .casesAssignedToday(casesAssigned)
                .callsCompletedToday(callsCompleted)
                .callsPendingToday(Math.max(0, casesAssigned - callsCompleted))
                .ptpsMadeToday(ptpsMade)
                .amountCommittedToday(committed)
                .build();
    }

    // ─── Team ─────────────────────────────────────────────────────────────────

    public TeamSection buildTeam(UUID orgId) {
        List<User> users = userRepo.findByOrganizationId(orgId);
        long active = users.stream().filter(User::isEnabled).count();

        Map<String, Long> byRole = users.stream()
                .flatMap(u -> u.getRoles().stream())
                .collect(Collectors.groupingBy(r -> r.getName(), Collectors.counting()));

        List<TeamSection.RoleCount> roleCounts = byRole.entrySet().stream()
                .map(e -> TeamSection.RoleCount.builder()
                        .roleName(e.getKey())
                        .count(e.getValue())
                        .build())
                .collect(Collectors.toList());

        return TeamSection.builder()
                .totalUsers(users.size())
                .activeUsers(active)
                .usersByRole(roleCounts)
                .build();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private UUID activeFileId(UUID orgId) {
        return activeDatasetResolver.activeFileId(orgId).orElse(NO_ACTIVE_DATASET);
    }
}
