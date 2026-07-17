package com.recoverpro.server.service;

import java.util.Optional;
import java.util.UUID;

/**
 * Tracks and enforces a per-org monthly token budget for Lucien AI chat (SYSTEM-PLAN SP42 --
 * extracted so callers can mock it instead of depending on the Redis-backed impl directly).
 */
public interface LucienTokenBudgetService {

    Optional<UUID> resolveOrgId(UUID agentId);

    void checkBudget(UUID orgId);

    void recordUsage(UUID orgId, int inputTokens, int outputTokens);
}
