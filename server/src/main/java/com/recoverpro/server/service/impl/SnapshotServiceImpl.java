package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.AgentPerformanceSnapshot;
import com.recoverpro.server.entity.MonthlyLoanBookSnapshot;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.repository.AgentPerformanceSnapshotRepository;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.MonthlyLoanBookSnapshotRepository;
import com.recoverpro.server.repository.NpaRecordRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.service.SnapshotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SnapshotServiceImpl implements SnapshotService {

    private final AgentPerformanceSnapshotRepository agentSnapshotRepository;
    private final MonthlyLoanBookSnapshotRepository loanBookSnapshotRepository;
    private final NpaRecordRepository npaRecordRepository;
    private final OrganizationRepository organizationRepository;
    private final AssignmentRepository assignmentRepository;
    private final CollectionRepository collectionRepository;
    private final AllocationRepository allocationRepository;

    @Override
    @Transactional
    public void captureAgentPerformanceSnapshot(UUID orgId, LocalDate date) {
        log.info("Capturing agent performance snapshot for orgId={}, date={}", orgId, date);
        List<Object[]> agentCounts = assignmentRepository.countAssignmentsByAgentForDate(date, orgId);

        for (Object[] row : agentCounts) {
            UUID agentId = (UUID) row[0];
            long assignedCount = ((Number) row[1]).longValue();

            long visitedCount = assignmentRepository.findByAgentIdAndDateOrdered(agentId, date)
                    .stream()
                    .filter(a -> a.getStatus() == AssignmentStatus.COMPLETED)
                    .count();
            long pendingCount = assignedCount - visitedCount;

            BigDecimal amountCollected = collectionRepository
                    .sumCollectionByAgentAndDate(agentId, date);
            long collectedCount = collectionRepository.countCollectionsByAgentAndDate(agentId, date);

            BigDecimal amountOutstanding = allocationRepository.sumOutstandingByAgentId(agentId);
            if (amountOutstanding == null) amountOutstanding = BigDecimal.ZERO;

            BigDecimal visitRate = safeRate((int) visitedCount, (int) assignedCount);
            BigDecimal efficiency = (amountCollected != null && amountOutstanding.compareTo(BigDecimal.ZERO) > 0)
                    ? amountCollected.multiply(BigDecimal.valueOf(100))
                            .divide(amountOutstanding, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal score = computeEfficiencyScore(visitRate, efficiency);

            AgentPerformanceSnapshot snapshot = AgentPerformanceSnapshot.builder()
                    .agentId(agentId)
                    .organizationId(orgId)
                    .snapshotDate(date)
                    .totalAssigned((int) assignedCount)
                    .totalVisited((int) visitedCount)
                    .totalCollected((int) collectedCount)
                    .totalPending((int) pendingCount)
                    .totalReassignedOut(0)
                    .totalReassignedIn(0)
                    .amountCollected(amountCollected != null ? amountCollected : BigDecimal.ZERO)
                    .amountOutstanding(amountOutstanding)
                    .visitCompletionRate(visitRate)
                    .collectionEfficiency(efficiency)
                    .efficiencyScore(score)
                    .build();

            upsertAgentSnapshot(snapshot);
        }
        log.info("Agent performance snapshot complete for orgId={}, date={}: {} agents",
                orgId, date, agentCounts.size());
    }

    @Override
    @Transactional
    public void captureMonthlyLoanBookSnapshot(UUID orgId, int month, int year) {
        LocalDate snapshotMonth = LocalDate.of(year, month, 1);
        log.info("Capturing monthly loan book snapshot for orgId={}, month={}/{}", orgId, month, year);

        if (loanBookSnapshotRepository.existsByOrganizationIdAndSnapshotMonth(orgId, snapshotMonth)) {
            log.warn("Snapshot already exists for orgId={} month={}/{}, skipping", orgId, month, year);
            return;
        }

        long npaCount = npaRecordRepository.countActiveByOrg(orgId);
        BigDecimal npaAmount = npaRecordRepository.sumOutstandingByOrg(orgId);

        long totalLoans = allocationRepository.countByOrgId(orgId);
        long assignedLoans = allocationRepository.countByOrgIdAndStatus(orgId, AllocationStatus.ASSIGNED);
        BigDecimal totalOutstanding = allocationRepository.sumOutstandingByOrgId(orgId);

        LocalDate monthEnd = snapshotMonth.plusMonths(1).minusDays(1);
        BigDecimal totalCollected = collectionRepository.sumVolumeByOrgAndDateRange(orgId, snapshotMonth, monthEnd);
        if (totalCollected == null) totalCollected = BigDecimal.ZERO;
        if (totalOutstanding == null) totalOutstanding = BigDecimal.ZERO;

        BigDecimal efficiencyPct = totalOutstanding.compareTo(BigDecimal.ZERO) > 0
                ? totalCollected.multiply(new BigDecimal("100")).divide(totalOutstanding, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        MonthlyLoanBookSnapshot snapshot = MonthlyLoanBookSnapshot.builder()
                .organizationId(orgId)
                .snapshotMonth(snapshotMonth)
                .totalLoans((int) totalLoans)
                .totalOutstandingAmount(totalOutstanding)
                .totalCollectedAmount(totalCollected)
                .totalNpaCount((int) npaCount)
                .totalNpaAmount(npaAmount != null ? npaAmount : BigDecimal.ZERO)
                .totalAssignedLoans((int) assignedLoans)
                .totalUnassignedLoans((int) (totalLoans - assignedLoans))
                .collectionEfficiencyPct(efficiencyPct)
                .recoveryRatePct(efficiencyPct)
                .build();

        loanBookSnapshotRepository.save(snapshot);
        log.info("Monthly loan book snapshot saved for orgId={} month={}/{}", orgId, month, year);
    }

    @Override
    @Transactional
    public int captureAllOrgsMonthlySnapshot(int month, int year) {
        log.info("Capturing monthly snapshots for ALL orgs, month={}/{}", month, year);
        List<Organization> activeOrgs = organizationRepository.findAll()
                .stream()
                .filter(Organization::isActive)
                .toList();

        int successCount = 0;
        int failureCount = 0;
        for (Organization org : activeOrgs) {
            try {
                captureMonthlyLoanBookSnapshot(org.getId(), month, year);
                successCount++;
            } catch (Exception e) {
                log.error("Failed to capture snapshot for orgId={}: {}", org.getId(), e.getMessage());
                failureCount++;
            }
        }
        log.info("All-org monthly snapshot complete for month={}/{}: {} succeeded, {} failed",
                month, year, successCount, failureCount);
        return successCount;
    }

    @Transactional
    public AgentPerformanceSnapshot upsertAgentSnapshot(AgentPerformanceSnapshot incoming) {
        return agentSnapshotRepository.findByAgentIdAndSnapshotDate(
                        incoming.getAgentId(), incoming.getSnapshotDate())
                .map(existing -> {
                    existing.setTotalAssigned(incoming.getTotalAssigned());
                    existing.setTotalVisited(incoming.getTotalVisited());
                    existing.setTotalCollected(incoming.getTotalCollected());
                    existing.setTotalPending(incoming.getTotalPending());
                    existing.setTotalReassignedOut(incoming.getTotalReassignedOut());
                    existing.setTotalReassignedIn(incoming.getTotalReassignedIn());
                    existing.setAmountCollected(incoming.getAmountCollected());
                    existing.setAmountOutstanding(incoming.getAmountOutstanding());
                    existing.setVisitCompletionRate(incoming.getVisitCompletionRate());
                    existing.setCollectionEfficiency(incoming.getCollectionEfficiency());
                    existing.setEfficiencyScore(incoming.getEfficiencyScore());
                    return agentSnapshotRepository.save(existing);
                })
                .orElseGet(() -> agentSnapshotRepository.save(incoming));
    }

    public BigDecimal computeEfficiencyScore(BigDecimal visitRate, BigDecimal collectionRate) {
        if (visitRate == null) visitRate = BigDecimal.ZERO;
        if (collectionRate == null) collectionRate = BigDecimal.ZERO;
        return visitRate.multiply(new BigDecimal("0.40"))
                .add(collectionRate.multiply(new BigDecimal("0.60")))
                .setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal safeRate(int numerator, int denominator) {
        if (denominator == 0) return BigDecimal.ZERO;
        return new BigDecimal(numerator)
                .multiply(new BigDecimal("100"))
                .divide(new BigDecimal(denominator), 2, RoundingMode.HALF_UP);
    }
}
