package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.LocationPingRequest;
import com.recoverpro.server.dto.request.SosRequest;
import com.recoverpro.server.dto.request.StartShiftRequest;
import com.recoverpro.server.dto.response.AgentLiveStatusResponse;
import com.recoverpro.server.dto.response.AgentShiftResponse;
import com.recoverpro.server.dto.response.IncidentReportResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface AgentFieldService {

    AgentShiftResponse startShift(StartShiftRequest request);

    AgentShiftResponse endShift(UUID agentId);

    AgentShiftResponse currentShift(UUID agentId);

    void recordPing(LocationPingRequest request);

    IncidentReportResponse triggerSos(SosRequest request);

    IncidentReportResponse resolveIncident(UUID id, UUID actingUserId, String notes);

    List<AgentLiveStatusResponse> listActiveAgents(UUID organizationId);

    Page<IncidentReportResponse> listIncidents(UUID organizationId, boolean unresolvedOnly, Pageable pageable);

    void storeSosAudio(UUID agentId, MultipartFile audio);

    void cancelSos(UUID incidentId, UUID agentId);
}
