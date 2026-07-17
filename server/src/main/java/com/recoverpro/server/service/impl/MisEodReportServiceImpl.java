package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.FoDayReportResponse;
import com.recoverpro.server.dto.response.FoDayReportResponse.SessionRow;
import com.recoverpro.server.dto.response.MisEodReportResponse;
import com.recoverpro.server.dto.response.MisEodReportResponse.FoRow;
import com.recoverpro.server.entity.*;
import com.recoverpro.server.enums.VisitSessionStatus;
import com.recoverpro.server.repository.*;
import com.recoverpro.server.service.MisEodReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Org-level MIS EOD totals + single-agent day report. Per-agent breakdown row-building lives in
 * {@link FoBreakdownBuilder} (SYSTEM-PLAN SP40 -- this class was 355 lines mixing both).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MisEodReportServiceImpl implements MisEodReportService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private final OrganizationRepository orgRepo;
    private final DailyVisitListRepository dispatchRepo;
    private final VisitLogRepository visitLogRepo;
    private final CollectionRepository collectionRepo;
    private final PtpRepository ptpRepo;
    private final NonContactableRepository ncRepo;
    private final VisitSessionRepository sessionRepo;
    private final UserRepository userRepo;
    private final AllocationRepository allocationRepo;
    private final FoBreakdownBuilder foBreakdownBuilder;

    @Override
    @Transactional(readOnly = true)
    public MisEodReportResponse generate(UUID orgId, LocalDate date) {
        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", orgId));

        Instant instStart = date.atStartOfDay(IST).toInstant();
        Instant instEnd   = date.plusDays(1).atStartOfDay(IST).toInstant();

        long totalDispatched = dispatchRepo.countByOrganizationIdAndDispatchDate(orgId, date);
        long activeAgents    = dispatchRepo.countDistinctActiveAgentsByOrgAndDate(orgId, date);

        long visitsCompleted  = visitLogRepo.countByOrganizationIdAndVisitDate(orgId, date);
        long visitsInProgress = sessionRepo.countByOrgDateAndStatuses(orgId, instStart, instEnd,
                List.of(VisitSessionStatus.STARTED, VisitSessionStatus.REACHED, VisitSessionStatus.WAITING));
        long visitsAbandoned  = sessionRepo.countByOrgDateAndStatuses(orgId, instStart, instEnd,
                List.of(VisitSessionStatus.ABANDONED));
        double completionRate = totalDispatched == 0 ? 0.0
                : Math.round(visitsCompleted * 1000.0 / totalDispatched) / 10.0;

        long collectionsCount = collectionRepo.countByOrgAndDateRange(orgId, date, date);
        BigDecimal totalCollected = coerceBD(collectionRepo.sumVolumeByOrgAndDateRange(orgId, date, date));

        List<UUID> agentIds = dispatchRepo.countByAgentForOrgAndDate(orgId, date)
                .stream().map(r -> (UUID) r[0]).collect(Collectors.toList());

        long ptpCount = 0; BigDecimal totalPromised = BigDecimal.ZERO;
        if (!agentIds.isEmpty()) {
            List<Object[]> ptpTotalsList = ptpRepo.countAndSumForOrgDate(agentIds, instStart, instEnd);
            if (!ptpTotalsList.isEmpty()) {
                Object[] ptpTotals = ptpTotalsList.get(0);
                ptpCount      = toLong(ptpTotals[0]);
                totalPromised = coerceBD(ptpTotals[1]);
            }
        }

        long ncCount          = ncRepo.countByOrgAndDate(orgId, instStart, instEnd);
        long pendingApprovals = collectionRepo.countPendingApprovalsByAgencyId(orgId);

        List<FoRow> foBreakdown = foBreakdownBuilder.build(orgId, date, instStart, instEnd, agentIds);

        return MisEodReportResponse.builder()
                .date(date)
                .organizationId(orgId)
                .organizationName(org.getName())
                .generatedAt(Instant.now())
                .totalDispatched(totalDispatched)
                .activeAgents(activeAgents)
                .visitsCompleted(visitsCompleted)
                .visitsInProgress(visitsInProgress)
                .visitsAbandoned(visitsAbandoned)
                .completionRate(completionRate)
                .collectionsCount(collectionsCount)
                .totalCollected(totalCollected)
                .ptpCount(ptpCount)
                .totalPromised(totalPromised)
                .nonContactableCount(ncCount)
                .pendingApprovals(pendingApprovals)
                .foBreakdown(foBreakdown)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FoDayReportResponse getFoDay(UUID orgId, UUID agentId, LocalDate date) {
        Instant from = date.atStartOfDay(IST).toInstant();
        Instant to   = date.plusDays(1).atStartOfDay(IST).toInstant();

        List<VisitSession> sessions = sessionRepo.findByAgentIdAndStartedAtBetween(agentId, from, to);
        sessions.sort(Comparator.comparing(s -> s.getStartedAt() == null ? Instant.MAX : s.getStartedAt()));

        String agentName = userRepo.findById(agentId)
                .map(u -> u.getFirstName() + " " + u.getLastName())
                .orElse(agentId.toString());

        List<UUID> allocIds = sessions.stream().map(VisitSession::getAllocationId)
                .filter(Objects::nonNull).distinct().collect(Collectors.toList());
        Map<UUID, Allocation> allocMap = new HashMap<>();
        allocationRepo.findAllById(allocIds).forEach(a -> allocMap.put(a.getId(), a));

        List<UUID> logIds = sessions.stream().map(VisitSession::getVisitLogId)
                .filter(Objects::nonNull).distinct().collect(Collectors.toList());
        Map<UUID, VisitLog> logMap = new HashMap<>();
        visitLogRepo.findAllById(logIds).forEach(l -> logMap.put(l.getId(), l));

        List<SessionRow> rows = sessions.stream().map(s -> {
            Allocation alloc = s.getAllocationId() != null ? allocMap.get(s.getAllocationId()) : null;
            VisitLog vlog    = s.getVisitLogId()   != null ? logMap.get(s.getVisitLogId())   : null;
            return toSessionRow(s, alloc, vlog);
        }).collect(Collectors.toList());

        Instant dayStart = sessions.stream().map(VisitSession::getStartedAt)
                .filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null);
        Instant dayEnd   = sessions.stream().map(VisitSession::getClosedAt)
                .filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        double totalKm = sessions.stream()
                .mapToDouble(s -> s.getDistanceMetres() != null ? s.getDistanceMetres() : 0.0).sum() / 1000.0;

        return FoDayReportResponse.builder()
                .agentId(agentId).agentName(agentName).date(date)
                .generatedAt(Instant.now())
                .dayStartedAt(dayStart).dayEndedAt(dayEnd)
                .totalDayMins(dayStart != null && dayEnd != null
                        ? Duration.between(dayStart, dayEnd).toMinutes() : null)
                .totalDistanceKm(Math.round(totalKm * 10.0) / 10.0)
                .totalSessions(sessions.size())
                .completedVisits((int) sessions.stream().filter(s -> s.getStatus() == VisitSessionStatus.CLOSED).count())
                .abandonedSessions((int) sessions.stream().filter(s -> s.getStatus() == VisitSessionStatus.ABANDONED).count())
                .sessions(rows)
                .build();
    }

    @Override
    public void runScheduled(LocalDate date) {
        orgRepo.findAll().forEach(org -> {
            try {
                MisEodReportResponse r = generate(org.getId(), date);
                log.info("MIS EOD [{}] date={} visits={}/{} collected={}",
                        org.getName(), date, r.getVisitsCompleted(),
                        r.getTotalDispatched(), r.getTotalCollected());
            } catch (Exception e) {
                log.error("MIS EOD failed for org={} date={}", org.getId(), date, e);
            }
        });
    }

    private SessionRow toSessionRow(VisitSession s, Allocation alloc, VisitLog vlog) {
        Long transitMins = (s.getStartedAt() != null && s.getReachedAt() != null)
                ? Duration.between(s.getStartedAt(), s.getReachedAt()).toMinutes() : null;
        Long waitingMins = (s.getWaitingSince() != null && s.getClosedAt() != null)
                ? Duration.between(s.getWaitingSince(), s.getClosedAt()).toMinutes() : null;
        Long totalMins   = (s.getStartedAt() != null && s.getClosedAt() != null)
                ? Duration.between(s.getStartedAt(), s.getClosedAt()).toMinutes() : null;

        String outcome = null;
        if (s.getStatus() == VisitSessionStatus.ABANDONED) outcome = "ABANDONED";
        else if (vlog != null) outcome = vlog.getVisitOutcome() != null ? vlog.getVisitOutcome()
                : (vlog.getDisp() != null ? vlog.getDisp().name() : null);

        return SessionRow.builder()
                .sessionId(s.getId())
                .allocationId(s.getAllocationId())
                .loanNumber(alloc != null ? alloc.getLoanNumber() : null)
                .borrowerName(alloc != null ? alloc.getBorrowerName() : null)
                .status(s.getStatus().name())
                .startedAt(s.getStartedAt()).reachedAt(s.getReachedAt())
                .waitingSince(s.getWaitingSince()).closedAt(s.getClosedAt())
                .transitMins(transitMins).waitingMins(waitingMins).totalMins(totalMins)
                .distanceKm(s.getDistanceMetres() != null
                        ? Math.round(s.getDistanceMetres() / 100.0) / 10.0 : 0.0)
                .outcome(outcome)
                .amountCollected(vlog != null ? vlog.getAmountCollected() : null)
                .paymentMode(vlog != null ? vlog.getPaymentMode() : null)
                .build();
    }

    private long toLong(Object o) { return o == null ? 0L : ((Number) o).longValue(); }

    private BigDecimal coerceBD(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal bd) return bd;
        return new BigDecimal(o.toString());
    }
}
