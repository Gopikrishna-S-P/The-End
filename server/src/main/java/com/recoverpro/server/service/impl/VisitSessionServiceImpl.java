package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CloseSessionRequest;
import com.recoverpro.server.dto.request.PingRequest;
import com.recoverpro.server.dto.request.StartVisitRequest;
import com.recoverpro.server.dto.request.VisitTransitionRequest;
import com.recoverpro.server.dto.response.DistanceSummaryEntry;
import com.recoverpro.server.dto.response.TeamStatusEntry;
import com.recoverpro.server.dto.response.VisitSessionResponse;
import com.recoverpro.server.entity.AgentLocationPing;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.VisitSession;
import com.recoverpro.server.enums.VisitSessionStatus;
import com.recoverpro.server.repository.AgentLocationPingRepository;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.repository.VisitSessionRepository;
import com.recoverpro.server.service.VisitSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VisitSessionServiceImpl implements VisitSessionService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private final VisitSessionRepository sessionRepo;
    private final AgentLocationPingRepository pingRepo;
    private final UserRepository userRepo;
    private final AllocationRepository allocationRepo;

    @Override
    @Transactional
    public VisitSessionResponse startVisit(UUID agentId, UUID orgId, StartVisitRequest request) {
        sessionRepo.findActiveByAgentId(agentId).ifPresent(s -> {
            throw new BusinessException("Close your current visit before starting a new one");
        });

        VisitSession session = VisitSession.builder()
                .allocationId(request.getAllocationId())
                .agentId(agentId)
                .orgId(orgId)
                .source(request.getSource())
                .dailyVisitListId(request.getDailyVisitListId())
                .assignmentId(request.getAssignmentId())
                .status(VisitSessionStatus.STARTED)
                .startedAt(Instant.now())
                .startedLat(request.getLat())
                .startedLng(request.getLng())
                .build();

        session = sessionRepo.save(session);
        log.info("Visit started: session={} agent={} allocation={}", session.getId(), agentId, request.getAllocationId());
        return toResponse(session);
    }

    @Override
    @Transactional
    public VisitSessionResponse markReached(UUID sessionId, UUID agentId, VisitTransitionRequest request) {
        VisitSession session = requireOwned(sessionId, agentId);
        if (session.getStatus() != VisitSessionStatus.STARTED) {
            throw new BusinessException("Can only mark reached from STARTED status");
        }
        session.setStatus(VisitSessionStatus.REACHED);
        session.setReachedAt(Instant.now());
        session.setReachedLat(request.getLat());
        session.setReachedLng(request.getLng());

        if (session.getStartedLat() != null && session.getStartedLng() != null
                && request.getLat() != null && request.getLng() != null) {
            double d = haversineMetres(session.getStartedLat(), session.getStartedLng(),
                    request.getLat(), request.getLng());
            session.setDistanceMetres(session.getDistanceMetres() + d);
        }

        session = sessionRepo.save(session);
        log.info("Visit reached: session={} distance={}m", sessionId, session.getDistanceMetres());
        return toResponse(session);
    }

    @Override
    @Transactional
    public VisitSessionResponse markWaiting(UUID sessionId, UUID agentId, VisitTransitionRequest request) {
        VisitSession session = requireOwned(sessionId, agentId);
        if (session.getStatus() != VisitSessionStatus.REACHED) {
            throw new BusinessException("Can only mark waiting from REACHED status");
        }
        session.setStatus(VisitSessionStatus.WAITING);
        session.setWaitingSince(Instant.now());
        return toResponse(sessionRepo.save(session));
    }

    @Override
    @Transactional
    public double ping(UUID sessionId, UUID agentId, PingRequest request) {
        VisitSession session = requireOwned(sessionId, agentId);
        if (session.getStatus() != VisitSessionStatus.WAITING) {
            throw new BusinessException("GPS ping only valid during WAITING status");
        }

        Optional<AgentLocationPing> lastPing = pingRepo.findTopByVisitSessionIdOrderByRecordedAtDesc(sessionId);
        Double fromLat = lastPing.map(AgentLocationPing::getLat).orElse(session.getReachedLat());
        Double fromLng = lastPing.map(AgentLocationPing::getLng).orElse(session.getReachedLng());

        if (fromLat != null && fromLng != null) {
            double d = haversineMetres(fromLat, fromLng, request.getLat(), request.getLng());
            session.setDistanceMetres(session.getDistanceMetres() + d);
            sessionRepo.save(session);
        }

        pingRepo.save(AgentLocationPing.builder()
                .agentId(agentId)
                .visitSessionId(sessionId)
                .lat(request.getLat())
                .lng(request.getLng())
                .accuracy(request.getAccuracy())
                .recordedAt(Instant.now())
                .build());

        log.info("GPS ping: session={} lat={} lng={} totalDistance={}m",
                sessionId, request.getLat(), request.getLng(), session.getDistanceMetres());
        return session.getDistanceMetres();
    }

    @Override
    @Transactional
    public VisitSessionResponse closeSession(UUID sessionId, UUID agentId, CloseSessionRequest request) {
        VisitSession session = requireOwned(sessionId, agentId);
        if (session.getStatus() == VisitSessionStatus.CLOSED
                || session.getStatus() == VisitSessionStatus.ABANDONED) {
            throw new BusinessException("Session is already " + session.getStatus());
        }
        session.setStatus(VisitSessionStatus.CLOSED);
        session.setClosedAt(Instant.now());
        if (request != null && request.getVisitLogId() != null) {
            session.setVisitLogId(request.getVisitLogId());
        }
        session = sessionRepo.save(session);
        log.info("Visit closed: session={} distance={}m visitLog={}", sessionId, session.getDistanceMetres(), session.getVisitLogId());
        return toResponse(session);
    }

    @Override
    @Transactional
    public VisitSessionResponse abandonSession(UUID sessionId, UUID agentId) {
        VisitSession session = requireOwned(sessionId, agentId);
        if (session.getStatus() == VisitSessionStatus.CLOSED
                || session.getStatus() == VisitSessionStatus.ABANDONED) {
            throw new BusinessException("Session is already " + session.getStatus());
        }
        session.setStatus(VisitSessionStatus.ABANDONED);
        session.setClosedAt(Instant.now());
        return toResponse(sessionRepo.save(session));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<VisitSessionResponse> getActive(UUID agentId) {
        return sessionRepo.findActiveByAgentId(agentId).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VisitSessionResponse> getToday(UUID agentId) {
        Instant[] range = dayRange(LocalDate.now());
        List<VisitSession> sessions = sessionRepo.findByAgentIdAndStartedAtBetween(agentId, range[0], range[1]);
        Map<UUID, String> names = buildNameMap(List.of(agentId));
        Map<UUID, Allocation> allocs = buildAllocMap(sessions);
        return sessions.stream().map(s -> toResponse(s, names, allocs)).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<VisitSessionResponse> getByVisitLogId(UUID visitLogId) {
        return sessionRepo.findByVisitLogId(visitLogId).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamStatusEntry> getTeamStatus(UUID orgId, LocalDate date) {
        Instant[] range = dayRange(date);
        List<VisitSession> sessions = sessionRepo.findByOrgIdAndStartedAtBetween(orgId, range[0], range[1]);

        Map<UUID, VisitSession> activeSessions = new LinkedHashMap<>();
        Map<UUID, Double> totalDistance = new LinkedHashMap<>();
        for (VisitSession s : sessions) {
            totalDistance.merge(s.getAgentId(), s.getDistanceMetres(), Double::sum);
            if (s.getStatus() == VisitSessionStatus.STARTED
                    || s.getStatus() == VisitSessionStatus.REACHED
                    || s.getStatus() == VisitSessionStatus.WAITING) {
                activeSessions.put(s.getAgentId(), s);
            }
        }

        Map<UUID, String> names = buildNameMap(new ArrayList<>(totalDistance.keySet()));
        Map<UUID, Allocation> allocs = buildAllocMap(sessions);

        return totalDistance.keySet().stream().map(agentId -> {
            VisitSession active = activeSessions.get(agentId);
            Allocation alloc = active != null ? allocs.get(active.getAllocationId()) : null;
            Instant statusSince = active == null ? null :
                    active.getStatus() == VisitSessionStatus.WAITING ? active.getWaitingSince() :
                    active.getStatus() == VisitSessionStatus.REACHED ? active.getReachedAt() :
                    active.getStartedAt();
            return TeamStatusEntry.builder()
                    .agentId(agentId)
                    .agentName(names.getOrDefault(agentId, "Unknown"))
                    .activeStatus(active != null ? active.getStatus() : null)
                    .activeSessionId(active != null ? active.getId() : null)
                    .activeLoanNumber(alloc != null ? alloc.getLoanNumber() : null)
                    .activeBorrowerName(alloc != null ? alloc.getBorrowerName() : null)
                    .statusSince(statusSince)
                    .totalDistanceMetres(totalDistance.getOrDefault(agentId, 0.0))
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DistanceSummaryEntry> getDistanceSummary(UUID orgId, LocalDate date) {
        Instant[] range = dayRange(date);
        List<VisitSession> sessions = sessionRepo.findByOrgIdAndStartedAtBetween(orgId, range[0], range[1]);

        Map<UUID, Double> totalDistance = new LinkedHashMap<>();
        Map<UUID, Integer> sessionCount = new LinkedHashMap<>();
        for (VisitSession s : sessions) {
            totalDistance.merge(s.getAgentId(), s.getDistanceMetres(), Double::sum);
            sessionCount.merge(s.getAgentId(), 1, Integer::sum);
        }

        Map<UUID, String> names = buildNameMap(new ArrayList<>(totalDistance.keySet()));
        return totalDistance.entrySet().stream().map(e -> DistanceSummaryEntry.builder()
                .agentId(e.getKey())
                .agentName(names.getOrDefault(e.getKey(), "Unknown"))
                .totalDistanceMetres(e.getValue())
                .sessionCount(sessionCount.getOrDefault(e.getKey(), 0))
                .build()).collect(Collectors.toList());
    }

    private VisitSession requireOwned(UUID sessionId, UUID agentId) {
        VisitSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("VisitSession", sessionId));
        if (!session.getAgentId().equals(agentId)) {
            throw new ResourceNotFoundException("VisitSession", sessionId);
        }
        return session;
    }

    private VisitSessionResponse toResponse(VisitSession s) {
        Map<UUID, String> names = buildNameMap(List.of(s.getAgentId()));
        Map<UUID, Allocation> allocs = buildAllocMap(List.of(s));
        return toResponse(s, names, allocs);
    }

    private VisitSessionResponse toResponse(VisitSession s, Map<UUID, String> names, Map<UUID, Allocation> allocs) {
        String agentName = names.getOrDefault(s.getAgentId(), "Unknown");
        Allocation alloc = s.getAllocationId() != null ? allocs.get(s.getAllocationId()) : null;
        return VisitSessionResponse.builder()
                .id(s.getId())
                .allocationId(s.getAllocationId())
                .loanNumber(alloc != null ? alloc.getLoanNumber() : null)
                .borrowerName(alloc != null ? alloc.getBorrowerName() : null)
                .agentId(s.getAgentId())
                .agentName(agentName)
                .status(s.getStatus())
                .source(s.getSource())
                .startedAt(s.getStartedAt())
                .startedLat(s.getStartedLat())
                .startedLng(s.getStartedLng())
                .reachedAt(s.getReachedAt())
                .reachedLat(s.getReachedLat())
                .reachedLng(s.getReachedLng())
                .waitingSince(s.getWaitingSince())
                .closedAt(s.getClosedAt())
                .distanceMetres(s.getDistanceMetres())
                .visitLogId(s.getVisitLogId())
                .build();
    }

    private Map<UUID, String> buildNameMap(List<UUID> ids) {
        return userRepo.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u.getFirstName() + " " + u.getLastName()));
    }

    private Map<UUID, Allocation> buildAllocMap(List<VisitSession> sessions) {
        List<UUID> ids = sessions.stream().map(VisitSession::getAllocationId).filter(Objects::nonNull)
                .distinct().collect(Collectors.toList());
        if (ids.isEmpty()) return Map.of();
        return allocationRepo.findAllById(ids).stream()
                .collect(Collectors.toMap(Allocation::getId, a -> a));
    }

    private Instant[] dayRange(LocalDate date) {
        return new Instant[]{
                date.atStartOfDay(IST).toInstant(),
                date.plusDays(1).atStartOfDay(IST).toInstant()
        };
    }

    private static double haversineMetres(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6_371_000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
