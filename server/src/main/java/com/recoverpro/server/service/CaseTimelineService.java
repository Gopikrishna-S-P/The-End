package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.CaseTimelineResponse;

import java.util.UUID;

public interface CaseTimelineService {
    CaseTimelineResponse getTimeline(UUID allocationId);
}
