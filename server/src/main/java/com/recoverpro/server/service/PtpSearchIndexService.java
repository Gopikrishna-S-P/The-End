package com.recoverpro.server.service;

import com.recoverpro.server.entity.PtpRecord;

import java.util.UUID;

/**
 * SYSTEM-PLAN 26.1: mirrors {@link AllocationSearchIndexService} for PtpRecord.borrowerName.
 * PtpRecord has no organization_id of its own (org scope is derived via allocation_id), so the
 * caller -- which already has the parent Allocation/Organization in hand at every write site --
 * supplies it explicitly rather than this service re-fetching it.
 */
public interface PtpSearchIndexService {
    void reindex(PtpRecord ptp, UUID organizationId);
}
