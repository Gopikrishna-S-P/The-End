package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.AgentSyncRequest;
import com.recoverpro.server.dto.response.AgentSyncResponse;

import java.util.UUID;

/**
 * Batched offline-sync orchestrator (design-doc §7.6). See
 * {@link com.recoverpro.server.service.impl.AgentSyncServiceImpl} for the per-item
 * failure-isolation and replay-idempotency behavior.
 */
public interface AgentSyncService {
    AgentSyncResponse process(AgentSyncRequest request, UUID actingUserId);
}
