package com.recoverpro.server.service.compliance;

import com.recoverpro.server.enums.GuardType;

import java.util.UUID;

public interface ComplianceAuditService {

    /**
     * Persists a compliance-guard denial. Must run in its own transaction (REQUIRES_NEW) so the
     * audit row survives even though the caller's transaction is about to roll back on the
     * exception the guard is throwing.
     */
    void record(GuardType guardType, UUID allocationId, UUID orgId, UUID actorId, String action, String reason);
}
