package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CreateDailyDispatchRequest;
import com.recoverpro.server.dto.response.AllocationResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Daily dispatch (spec §6.1). TL curates a per-FO list of cases for a date;
 * FO reads their own list to start the day's visits.
 */
public interface DailyDispatchService {

    /** Replaces any prior list for the same (org, agent, date) tuple. */
    List<AllocationResponse> createDispatch(UUID orgId, UUID actorId, CreateDailyDispatchRequest request);

    List<AllocationResponse> getListForAgent(UUID orgId, UUID agentId, LocalDate date);

    void removeCase(UUID orgId, UUID agentId, LocalDate date, UUID allocationId);

    long countDispatchedForOrg(UUID orgId, LocalDate date);
}
