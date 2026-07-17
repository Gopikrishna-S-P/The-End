package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.NpaFlagRequest;
import com.recoverpro.server.dto.response.NpaReportResponse;
import com.recoverpro.server.enums.NpaRiskLevel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface NpaService {

    NpaReportResponse flagNpaRecords(NpaFlagRequest request);

    NpaReportResponse getNpaReport(UUID orgId, LocalDate date);

    Page<NpaReportResponse.NpaRecordResponse> getNpaRecords(UUID orgId, NpaRiskLevel riskLevel, Pageable pageable);

    void resolveNpaRecord(UUID npaId, UUID resolvedBy);

    /**
     * Scans this org's active allocations for a dpd_days (days-past-due) figure in their
     * uploaded row data, classifies risk, and upserts/resolves NpaRecord rows accordingly.
     * Returns the number of allocations flagged (created or updated) as NPA this run.
     */
    int flagOverdueAllocations(UUID orgId);
}
