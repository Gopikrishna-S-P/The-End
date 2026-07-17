package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CloseSessionRequest;
import com.recoverpro.server.dto.request.PingRequest;
import com.recoverpro.server.dto.request.StartVisitRequest;
import com.recoverpro.server.dto.request.VisitTransitionRequest;
import com.recoverpro.server.dto.response.DistanceSummaryEntry;
import com.recoverpro.server.dto.response.TeamStatusEntry;
import com.recoverpro.server.dto.response.VisitSessionResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VisitSessionService {

    VisitSessionResponse startVisit(UUID agentId, UUID orgId, StartVisitRequest request);

    VisitSessionResponse markReached(UUID sessionId, UUID agentId, VisitTransitionRequest request);

    VisitSessionResponse markWaiting(UUID sessionId, UUID agentId, VisitTransitionRequest request);

    double ping(UUID sessionId, UUID agentId, PingRequest request);

    VisitSessionResponse closeSession(UUID sessionId, UUID agentId, CloseSessionRequest request);

    VisitSessionResponse abandonSession(UUID sessionId, UUID agentId);

    Optional<VisitSessionResponse> getActive(UUID agentId);

    List<VisitSessionResponse> getToday(UUID agentId);

    Optional<VisitSessionResponse> getByVisitLogId(UUID visitLogId);

    List<TeamStatusEntry> getTeamStatus(UUID orgId, LocalDate date);

    List<DistanceSummaryEntry> getDistanceSummary(UUID orgId, LocalDate date);
}
