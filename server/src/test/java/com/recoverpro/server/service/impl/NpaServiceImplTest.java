package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.NpaFlagRequest;
import com.recoverpro.server.dto.response.NpaReportResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.NpaRecord;
import com.recoverpro.server.enums.NpaRiskLevel;
import com.recoverpro.server.mapper.ReportMapper;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.NpaRecordRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage for two real bugs found in the same pass:
 *  1. npaRatioPct -- the DTO/frontend both expect it (portfolio-risk page renders it directly,
 *     falling back to 0 when absent) but buildNpaReport never populated it, so "Risk ratio" silently
 *     showed 0.0% regardless of actual data.
 *  2. flagNpaRecords -- the "Re-run sweep" button's endpoint used to just re-read whatever was
 *     already flagged and never actually classified any allocation; flagOverdueAllocations (the real
 *     logic) was only reachable from the monthly scheduler.
 */
@ExtendWith(MockitoExtension.class)
class NpaServiceImplTest {

    @Mock private NpaRecordRepository npaRecordRepository;
    @Mock private AllocationRepository allocationRepository;
    @Mock private ReportMapper reportMapper;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private NpaServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new NpaServiceImpl(npaRecordRepository, allocationRepository, reportMapper, orgIsolationGuard);
        when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        lenient().when(reportMapper.toNpaRecordResponse(any()))
                .thenReturn(NpaReportResponse.NpaRecordResponse.builder().build());
    }

    @Test
    void getNpaReport_computesRatioAgainstActiveBook() {
        UUID orgId = UUID.randomUUID();
        LocalDate date = LocalDate.now();
        List<NpaRecord> flagged = List.of(
                NpaRecord.builder().organizationId(orgId).riskLevel(NpaRiskLevel.HIGH)
                        .outstandingAmount(BigDecimal.valueOf(1000)).build(),
                NpaRecord.builder().organizationId(orgId).riskLevel(NpaRiskLevel.LOW)
                        .outstandingAmount(BigDecimal.valueOf(500)).build());
        when(npaRecordRepository.findByOrganizationIdAndFlaggedDateLessThanEqualAndIsResolvedFalse(orgId, date))
                .thenReturn(flagged);
        when(allocationRepository.countByOrgId(orgId)).thenReturn(20L);

        NpaReportResponse report = service.getNpaReport(orgId, date);

        assertThat(report.getNpaRatioPct()).isEqualByComparingTo("10.00");
    }

    @Test
    void getNpaReport_zeroActiveBook_ratioIsZeroNotDivideByZero() {
        UUID orgId = UUID.randomUUID();
        LocalDate date = LocalDate.now();
        when(npaRecordRepository.findByOrganizationIdAndFlaggedDateLessThanEqualAndIsResolvedFalse(orgId, date))
                .thenReturn(List.of());
        when(allocationRepository.countByOrgId(orgId)).thenReturn(0L);

        NpaReportResponse report = service.getNpaReport(orgId, date);

        assertThat(report.getNpaRatioPct()).isEqualByComparingTo("0");
    }

    @Test
    void flagNpaRecords_actuallyClassifiesAndSavesOverdueAllocation() {
        UUID orgId = UUID.randomUUID();
        NpaFlagRequest request = NpaFlagRequest.builder()
                .organizationId(orgId)
                .overdueThresholdDays(30)
                .build();

        Allocation overdue = Allocation.builder()
                .id(UUID.randomUUID())
                .loanNumber("LN-1")
                .borrowerName("Borrower One")
                .outstandingAmount(BigDecimal.valueOf(2000))
                .dynamicData(Map.of("dpd_days", 45))
                .build();
        when(allocationRepository.findByOrganizationIdAndIsDeletedFalse(orgId))
                .thenReturn(List.of(overdue));
        when(npaRecordRepository.findByAllocationIdAndIsResolvedFalse(overdue.getId()))
                .thenReturn(Optional.empty());
        when(npaRecordRepository.findByOrganizationIdAndFlaggedDateLessThanEqualAndIsResolvedFalse(eq(orgId), any()))
                .thenReturn(List.of());
        when(allocationRepository.countByOrgId(orgId)).thenReturn(1L);

        service.flagNpaRecords(request);

        verify(npaRecordRepository).save(argThat(r ->
                r.getAllocationId().equals(overdue.getId()) && r.getRiskLevel() == NpaRiskLevel.MEDIUM));
    }
}
