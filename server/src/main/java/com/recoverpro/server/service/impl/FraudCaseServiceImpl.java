package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateFraudCaseRequest;
import com.recoverpro.server.dto.request.TransitionFraudCaseRequest;
import com.recoverpro.server.dto.response.FraudCaseResponse;
import com.recoverpro.server.entity.FraudCase;
import com.recoverpro.server.enums.FraudCaseStatus;
import com.recoverpro.server.repository.FraudCaseRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.FraudCaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Fraud case workflow (design-doc §9.10 — RBI Master Direction on Frauds, 2016).
 *
 *   REPORTED → UNDER_INVESTIGATION → CONFIRMED | REJECTED
 *   CONFIRMED → CLOSED (post-recovery / write-off)
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class FraudCaseServiceImpl implements FraudCaseService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final DateTimeFormatter DATE_TAG =
            DateTimeFormatter.ofPattern("yyyyMMdd").withZone(IST);

    private final FraudCaseRepository fraudRepository;
    private final OrgIsolationGuard orgIsolationGuard;

    // CFR (Central Fraud Registry) integration does not exist yet. Default OFF everywhere so this
    // never silently reads as a completed clean screen for an RBI frauds workflow (SYSTEM-PLAN SP11).
    @Value("${fraud.cfr-lookup.enabled:false}")
    private boolean cfrLookupEnabled;

    @Override
    public FraudCaseResponse create(CreateFraudCaseRequest request, UUID actingUserId) {
        if (!orgIsolationGuard.belongsToOrg(request.getOrganizationId())) {
            throw new ResourceNotFoundException("Organization", request.getOrganizationId());
        }
        FraudCase c = FraudCase.builder()
                .caseNumber(generateUniqueCaseNumber())
                .organizationId(request.getOrganizationId())
                .allocationId(request.getAllocationId())
                .borrowerId(request.getBorrowerId())
                .category(request.getCategory())
                .amountInvolved(request.getAmountInvolved())
                .incidentDate(request.getIncidentDate())
                .description(request.getDescription())
                .evidenceUrl(request.getEvidenceUrl())
                .status(FraudCaseStatus.REPORTED)
                .reportedByUserId(actingUserId)
                .reportedAt(Instant.now())
                .build();
        FraudCase saved = fraudRepository.save(c);
        log.info("Fraud case reported: case={}, org={}, category={}",
                saved.getCaseNumber(), saved.getOrganizationId(), saved.getCategory());
        return toResponse(saved);
    }

    @Override
    public FraudCaseResponse transition(UUID id, TransitionFraudCaseRequest request, UUID actingUserId) {
        FraudCase c = fraudRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FraudCase", id));
        if (!orgIsolationGuard.belongsToOrg(c.getOrganizationId())) {
            throw new ResourceNotFoundException("FraudCase", id);
        }
        FraudCaseStatus from = c.getStatus();
        FraudCaseStatus to   = request.getNewStatus();
        validateTransition(from, to);

        if (request.getInvestigationNotes() != null && !request.getInvestigationNotes().isBlank()) {
            c.setInvestigationNotes(request.getInvestigationNotes());
        }
        if (to == FraudCaseStatus.UNDER_INVESTIGATION || to == FraudCaseStatus.CONFIRMED) {
            c.setInvestigatedByUserId(actingUserId);
        }
        if (to == FraudCaseStatus.REJECTED) {
            c.setRejectionReason(request.getRejectionReason());
        }
        c.setStatus(to);
        log.info("Fraud case {} {} -> {} by user {}", c.getCaseNumber(), from, to, actingUserId);
        return toResponse(fraudRepository.save(c));
    }

    @Override
    @Transactional(readOnly = true)
    public FraudCaseResponse getById(UUID id) {
        FraudCase c = fraudRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FraudCase", id));
        if (!orgIsolationGuard.belongsToOrg(c.getOrganizationId())) {
            throw new ResourceNotFoundException("FraudCase", id);
        }
        return toResponse(c);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<FraudCaseResponse> list(UUID organizationId, FraudCaseStatus status, Pageable pageable) {
        if (!orgIsolationGuard.belongsToOrg(organizationId)) {
            throw new ResourceNotFoundException("Organization", organizationId);
        }
        Page<FraudCase> page = (status == null)
                ? fraudRepository.findByOrganizationIdOrderByReportedAtDesc(organizationId, pageable)
                : fraudRepository.findByOrganizationIdAndStatusOrderByReportedAtDesc(organizationId, status, pageable);
        return page.map(this::toResponse);
    }

    @Override
    public FraudCaseResponse runCfrLookup(UUID id, UUID actingUserId) {
        FraudCase c = fraudRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FraudCase", id));
        if (!orgIsolationGuard.belongsToOrg(c.getOrganizationId())) {
            throw new ResourceNotFoundException("FraudCase", id);
        }
        if (!cfrLookupEnabled) {
            // Never write cfrLookupAt/cfrLookupResult here - doing so would make this read as a
            // completed negative screen to an RBI frauds investigator, when nothing was checked.
            throw new BusinessException(
                    "CFR lookup is not available yet. This case has NOT been screened against the Central Fraud Registry.");
        }
        c.setCfrLookupAt(Instant.now());
        c.setCfrLookupResult("CFR lookup not yet integrated -- placeholder NO_HIT");
        log.info("CFR lookup recorded (stub) for fraud case {} by user {}", c.getCaseNumber(), actingUserId);
        return toResponse(fraudRepository.save(c));
    }

    private static void validateTransition(FraudCaseStatus from, FraudCaseStatus to) {
        if (from == to) return;
        boolean ok = switch (from) {
            case REPORTED            -> to == FraudCaseStatus.UNDER_INVESTIGATION
                                     || to == FraudCaseStatus.REJECTED;
            case UNDER_INVESTIGATION -> to == FraudCaseStatus.CONFIRMED
                                     || to == FraudCaseStatus.REJECTED;
            case CONFIRMED           -> to == FraudCaseStatus.CLOSED;
            case REJECTED, CLOSED    -> false;
        };
        if (!ok) throw new BusinessException("Illegal fraud-case transition: " + from + " -> " + to);
    }

    private String generateUniqueCaseNumber() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = "FRD-" + DATE_TAG.format(Instant.now()) + "-" + randomAlnum(6);
            if (!fraudRepository.existsByCaseNumber(candidate)) return candidate;
        }
        return "FRD-" + DATE_TAG.format(Instant.now()) + "-" + randomAlnum(10);
    }

    private static String randomAlnum(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return sb.toString();
    }

    private FraudCaseResponse toResponse(FraudCase c) {
        return FraudCaseResponse.builder()
                .id(c.getId())
                .caseNumber(c.getCaseNumber())
                .organizationId(c.getOrganizationId())
                .allocationId(c.getAllocationId())
                .borrowerId(c.getBorrowerId())
                .category(c.getCategory())
                .amountInvolved(c.getAmountInvolved())
                .incidentDate(c.getIncidentDate())
                .description(c.getDescription())
                .evidenceUrl(c.getEvidenceUrl())
                .status(c.getStatus())
                .investigatedByUserId(c.getInvestigatedByUserId())
                .investigationNotes(c.getInvestigationNotes())
                .rejectionReason(c.getRejectionReason())
                .reportedByUserId(c.getReportedByUserId())
                .reportedAt(c.getReportedAt())
                .cfrLookupAt(c.getCfrLookupAt())
                .cfrLookupResult(c.getCfrLookupResult())
                .frmsSubmittedAt(c.getFrmsSubmittedAt())
                .frmsAcknowledgement(c.getFrmsAcknowledgement())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
