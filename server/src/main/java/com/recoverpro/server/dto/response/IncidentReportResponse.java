package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class IncidentReportResponse {

    private UUID id;
    private UUID agentId;
    private String agentName;
    private UUID organizationId;
    private UUID shiftId;
    private Instant triggeredAt;
    private Double lastKnownLat;
    private Double lastKnownLng;
    private Double lastKnownAccuracy;
    private List<Map<String, Object>> recentPings;
    private String notes;
    private Instant resolvedAt;
    private UUID resolvedByUserId;
    private String resolutionNotes;
    private Instant createdAt;
}
