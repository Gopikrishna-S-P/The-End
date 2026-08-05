package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.MisEodReportResponse.CaseRow;
import com.recoverpro.server.dto.response.MisEodReportResponse.FoRow;
import com.recoverpro.server.entity.*;
import com.recoverpro.server.enums.VisitSessionStatus;
import com.recoverpro.server.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Builds the per-agent MIS EOD breakdown rows (SYSTEM-PLAN SP40 -- split out of the 355-line
 * MisEodReportServiceImpl, which mixed org-level totals with this per-agent aggregation).
 */
@Component
@RequiredArgsConstructor
public class FoBreakdownBuilder {

    private final DailyVisitListRepository dispatchRepo;
    private final VisitLogRepository visitLogRepo;
    private final CollectionRepository collectionRepo;
    private final PtpRepository ptpRepo;
    private final NonContactableRepository ncRepo;
    private final VisitSessionRepository sessionRepo;
    private final UserRepository userRepo;
    private final AllocationRepository allocationRepo;
    private final AgentShiftRepository shiftRepo;

    public List<FoRow> build(UUID orgId, LocalDate date, Instant instStart, Instant instEnd, List<UUID> agentIds) {
        Map<UUID, Long> dispatched = toUUIDLongMap(dispatchRepo.countByAgentForOrgAndDate(orgId, date));
        Map<UUID, Long> visits     = toUUIDLongMap(visitLogRepo.countByAgentForOrgAndDate(orgId, date));

        Map<UUID, Long> colCounts  = new HashMap<>();
        Map<UUID, BigDecimal> colAmts = new HashMap<>();
        collectionRepo.countAndSumByAgentForOrgAndDate(orgId, date).forEach(row -> {
            colCounts.put((UUID) row[0], toLong(row[1]));
            colAmts.put((UUID) row[0], coerceBD(row[2]));
        });

        Map<UUID, Long> ptpCounts = new HashMap<>();
        if (!agentIds.isEmpty()) {
            ptpRepo.countAndSumByAgentsForDate(agentIds, instStart, instEnd)
                    .forEach(row -> ptpCounts.put((UUID) row[0], toLong(row[1])));
        }

        Map<UUID, Long> ncCounts = toUUIDLongMap(ncRepo.countByAgentForOrgAndDate(orgId, instStart, instEnd));

        Map<UUID, Double> distKm = new HashMap<>();
        sessionRepo.sumDistanceByAgentForOrgAndDate(orgId, instStart, instEnd).forEach(row ->
                distKm.put((UUID) row[0], ((Number) row[1]).doubleValue() / 1000.0));

        Map<UUID, Instant> loginTimes  = new HashMap<>();
        Map<UUID, Instant> logoutTimes = new HashMap<>();
        shiftRepo.findByOrgAndDate(orgId, instStart, instEnd).forEach(shift -> {
            loginTimes.merge(shift.getAgentId(), shift.getStartedAt(),
                    (a, b) -> a.isBefore(b) ? a : b);
            if (shift.getEndedAt() != null) {
                logoutTimes.merge(shift.getAgentId(), shift.getEndedAt(),
                        (a, b) -> a.isAfter(b) ? a : b);
            }
        });

        List<DailyVisitList> allDispatches = dispatchRepo.findByOrganizationIdAndDispatchDate(orgId, date);
        Map<UUID, List<UUID>> dispatchAllocsByAgent = allDispatches.stream()
                .collect(Collectors.groupingBy(
                        DailyVisitList::getAgentUserId,
                        Collectors.mapping(DailyVisitList::getAllocationId, Collectors.toList())));

        List<VisitSession> allSessions = sessionRepo.findByOrgIdAndStartedAtBetween(orgId, instStart, instEnd);
        Map<UUID, List<VisitSession>> sessionsByAgent = allSessions.stream()
                .collect(Collectors.groupingBy(VisitSession::getAgentId));

        Set<UUID> allAllocIds = new HashSet<>();
        allSessions.stream().map(VisitSession::getAllocationId).filter(Objects::nonNull).forEach(allAllocIds::add);
        allDispatches.stream().map(DailyVisitList::getAllocationId).forEach(allAllocIds::add);
        Map<UUID, Allocation> allocMap = new HashMap<>();
        if (!allAllocIds.isEmpty()) {
            allocationRepo.findAllById(allAllocIds).forEach(a -> allocMap.put(a.getId(), a));
        }

        List<UUID> logIds = allSessions.stream().map(VisitSession::getVisitLogId)
                .filter(Objects::nonNull).distinct().collect(Collectors.toList());
        Map<UUID, VisitLog> logMap = new HashMap<>();
        visitLogRepo.findAllById(logIds).forEach(l -> logMap.put(l.getId(), l));

        Map<UUID, String> names = new HashMap<>();
        userRepo.findAllById(dispatched.keySet()).forEach(u ->
                names.put(u.getId(), u.getFirstName() + " " + u.getLastName()));

        return dispatched.keySet().stream()
                .map(aid -> {
                    List<VisitSession> agentSessions = sessionsByAgent.getOrDefault(aid, List.of())
                            .stream()
                            .sorted(Comparator.comparing(s -> s.getStartedAt() == null ? Instant.MAX : s.getStartedAt()))
                            .collect(Collectors.toList());

                    Set<UUID> coveredAllocIds = new HashSet<>();
                    List<CaseRow> cases = new ArrayList<>();
                    for (VisitSession s : agentSessions) {
                        Allocation alloc = s.getAllocationId() != null ? allocMap.get(s.getAllocationId()) : null;
                        VisitLog vlog    = s.getVisitLogId()   != null ? logMap.get(s.getVisitLogId())   : null;
                        cases.add(toCaseRow(s, alloc, vlog));
                        if (s.getAllocationId() != null) coveredAllocIds.add(s.getAllocationId());
                    }

                    dispatchAllocsByAgent.getOrDefault(aid, List.of()).stream()
                            .filter(allocId -> !coveredAllocIds.contains(allocId))
                            .forEach(allocId -> {
                                Allocation alloc = allocMap.get(allocId);
                                cases.add(CaseRow.builder()
                                        .loanNumber(alloc != null ? alloc.getLoanNumber() : null)
                                        .borrowerName(alloc != null ? alloc.getBorrowerName() : null)
                                        .status("DISPATCHED")
                                        .distanceKm(0.0)
                                        .build());
                            });

                    return FoRow.builder()
                            .agentId(aid)
                            .agentName(names.getOrDefault(aid, aid.toString()))
                            .loginTime(loginTimes.get(aid))
                            .logoutTime(logoutTimes.get(aid))
                            .dispatched(dispatched.getOrDefault(aid, 0L))
                            .visited(visits.getOrDefault(aid, 0L))
                            .collected(colCounts.getOrDefault(aid, 0L))
                            .amountCollected(colAmts.getOrDefault(aid, BigDecimal.ZERO))
                            .ptpMade(ptpCounts.getOrDefault(aid, 0L))
                            .nonContactable(ncCounts.getOrDefault(aid, 0L))
                            .distanceKm(Math.round(distKm.getOrDefault(aid, 0.0) * 10.0) / 10.0)
                            .cases(cases)
                            .build();
                })
                .sorted(Comparator.comparing(FoRow::getAgentName))
                .collect(Collectors.toList());
    }

    private CaseRow toCaseRow(VisitSession s, Allocation alloc, VisitLog vlog) {
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

        return CaseRow.builder()
                .loanNumber(alloc != null ? alloc.getLoanNumber() : null)
                .borrowerName(alloc != null ? alloc.getBorrowerName() : null)
                .status(s.getStatus().name())
                .startedAt(s.getStartedAt())
                .reachedAt(s.getReachedAt())
                .waitingSince(s.getWaitingSince())
                .closedAt(s.getClosedAt())
                .transitMins(transitMins)
                .waitingMins(waitingMins)
                .totalMins(totalMins)
                .distanceKm(s.getDistanceMetres() != null
                        ? Math.round(s.getDistanceMetres() / 100.0) / 10.0 : 0.0)
                .outcome(outcome)
                .amountCollected(vlog != null ? vlog.getAmountCollected() : null)
                .paymentMode(vlog != null ? vlog.getPaymentMode() : null)
                .build();
    }

    private Map<UUID, Long> toUUIDLongMap(List<Object[]> rows) {
        Map<UUID, Long> map = new HashMap<>();
        for (Object[] row : rows) map.put((UUID) row[0], toLong(row[1]));
        return map;
    }

    private long toLong(Object o) { return o == null ? 0L : ((Number) o).longValue(); }

    private BigDecimal coerceBD(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal bd) return bd;
        return new BigDecimal(o.toString());
    }
}
