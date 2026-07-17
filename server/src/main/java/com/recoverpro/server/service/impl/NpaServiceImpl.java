package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.NpaFlagRequest;
import com.recoverpro.server.dto.response.NpaReportResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.NpaRecord;
import com.recoverpro.server.enums.NpaRiskLevel;
import com.recoverpro.server.mapper.ReportMapper;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.NpaRecordRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.NpaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NpaServiceImpl implements NpaService {

    private final NpaRecordRepository npaRecordRepository;
    private final AllocationRepository allocationRepository;
    private final ReportMapper reportMapper;
    private final OrgIsolationGuard orgIsolationGuard;

    private static final int MEDIUM_THRESHOLD   = 30;
    private static final int HIGH_THRESHOLD     = 60;
    private static final int CRITICAL_THRESHOLD = 90;

    @Override
    @Transactional(readOnly = true)
    public NpaReportResponse getNpaReport(UUID orgId, LocalDate date) {
        List<NpaRecord> records = npaRecordRepository
                .findByOrganizationIdAndFlaggedDateAndIsResolvedFalse(orgId, date);
        return buildNpaReport(orgId, date, records);
    }

    @Override
    @Transactional
    public NpaReportResponse flagNpaRecords(NpaFlagRequest request) {
        log.info("Flagging NPA records for orgId={}, threshold={}d",
                request.getOrganizationId(), request.getOverdueThresholdDays());
        List<NpaRecord> active = npaRecordRepository
                .findByOrganizationIdAndFlaggedDateAndIsResolvedFalse(
                        request.getOrganizationId(), LocalDate.now());
        log.info("Found {} active NPA records for org {}", active.size(), request.getOrganizationId());
        return buildNpaReport(request.getOrganizationId(), LocalDate.now(), active);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NpaReportResponse.NpaRecordResponse> getNpaRecords(UUID orgId, NpaRiskLevel riskLevel,
                                                                    Pageable pageable) {
        return npaRecordRepository.findActiveWithFilters(orgId, riskLevel, pageable)
                .map(reportMapper::toNpaRecordResponse);
    }

    @Override
    @Transactional
    public void resolveNpaRecord(UUID npaId, UUID resolvedBy) {
        NpaRecord record = npaRecordRepository.findById(npaId)
                .orElseThrow(() -> new ResourceNotFoundException("NPA record not found: " + npaId));
        if (!orgIsolationGuard.belongsToOrg(record.getOrganizationId())) {
            throw new ResourceNotFoundException("NPA record not found: " + npaId);
        }
        record.setIsResolved(true);
        record.setResolvedDate(LocalDate.now());
        npaRecordRepository.save(record);
        log.info("NPA record resolved: id={} by userId={}", npaId, resolvedBy);
    }

    @Override
    @Transactional
    public int flagOverdueAllocations(UUID orgId) {
        List<Allocation> allocations = allocationRepository.findByOrganizationIdAndIsDeletedFalse(orgId);
        int flagged = 0;
        for (Allocation allocation : allocations) {
            Integer overdueDays = extractOverdueDays(allocation);
            var existing = npaRecordRepository.findByAllocationIdAndIsResolvedFalse(allocation.getId());

            if (overdueDays == null) {
                continue;
            }
            NpaRiskLevel risk = classifyRisk(overdueDays);
            if (risk == NpaRiskLevel.LOW) {
                // No longer overdue enough to stay flagged - resolve any existing record.
                existing.ifPresent(r -> {
                    r.setIsResolved(true);
                    r.setResolvedDate(LocalDate.now());
                    npaRecordRepository.save(r);
                });
                continue;
            }

            NpaRecord record = existing.orElseGet(() -> NpaRecord.builder()
                    .allocationId(allocation.getId())
                    .organizationId(orgId)
                    .loanNumber(allocation.getLoanNumber())
                    .borrowerName(allocation.getBorrowerName())
                    .flaggedDate(LocalDate.now())
                    .isResolved(false)
                    .build());
            record.setOutstandingAmount(
                    allocation.getOutstandingAmount() != null ? allocation.getOutstandingAmount() : BigDecimal.ZERO);
            record.setOverdueDays(overdueDays);
            record.setRiskLevel(risk);
            npaRecordRepository.save(record);
            flagged++;
        }
        log.info("NPA flagging complete for orgId={}: {} allocations flagged/updated", orgId, flagged);
        return flagged;
    }

    private Integer extractOverdueDays(Allocation allocation) {
        if (allocation.getDynamicData() == null) return null;
        Object raw = allocation.getDynamicData().get("dpd_days");
        if (raw == null) return null;
        try {
            return switch (raw) {
                case Number n -> n.intValue();
                case String s -> Integer.parseInt(s.trim());
                default -> null;
            };
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public NpaRiskLevel classifyRisk(int overdueDays) {
        if (overdueDays >= CRITICAL_THRESHOLD) return NpaRiskLevel.CRITICAL;
        if (overdueDays >= HIGH_THRESHOLD)     return NpaRiskLevel.HIGH;
        if (overdueDays >= MEDIUM_THRESHOLD)   return NpaRiskLevel.MEDIUM;
        return NpaRiskLevel.LOW;
    }

    private NpaReportResponse buildNpaReport(UUID orgId, LocalDate date, List<NpaRecord> records) {
        BigDecimal totalAmount = records.stream()
                .map(NpaRecord::getOutstandingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<NpaRiskLevel, Integer>    countByRisk  = new EnumMap<>(NpaRiskLevel.class);
        Map<NpaRiskLevel, BigDecimal> amountByRisk = new EnumMap<>(NpaRiskLevel.class);

        for (NpaRecord r : records) {
            countByRisk.merge(r.getRiskLevel(), 1, Integer::sum);
            amountByRisk.merge(r.getRiskLevel(), r.getOutstandingAmount(), BigDecimal::add);
        }

        List<NpaReportResponse.NpaRecordResponse> recordResponses = records.stream()
                .map(reportMapper::toNpaRecordResponse)
                .collect(Collectors.toList());

        return NpaReportResponse.builder()
                .organizationId(orgId)
                .reportDate(date)
                .totalNpaCount(records.size())
                .totalNpaAmount(totalAmount)
                .countByRiskLevel(countByRisk)
                .amountByRiskLevel(amountByRisk)
                .records(recordResponses)
                .build();
    }
}
