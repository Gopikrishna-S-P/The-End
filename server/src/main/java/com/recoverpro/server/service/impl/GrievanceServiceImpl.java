package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.AcknowledgeGrievanceRequest;
import com.recoverpro.server.dto.request.EscalateGrievanceRequest;
import com.recoverpro.server.dto.request.InvestigateGrievanceRequest;
import com.recoverpro.server.dto.request.RaiseGrievanceRequest;
import com.recoverpro.server.dto.request.ResolveGrievanceRequest;
import com.recoverpro.server.dto.response.GrievanceResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Grievance;
import com.recoverpro.server.enums.GrievanceStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.GrievanceRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.GrievanceService;
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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Grievance workflow: RECEIVED -> ACKNOWLEDGED -> INVESTIGATING -> [ESCALATED] -> RESOLVED ->
 * CLOSED (see docs/superpowers/specs/2026-08-04-grievances-design.md; status/category values
 * match the pre-existing grievances_status_check/grievances_category_check constraints discovered
 * live in the dev DB, brought under Flyway in V075). Modeled after FraudCaseServiceImpl -- a
 * "case" entity with a generated reference number and a simple linear status switch, not an
 * approve/reject workflow -- so there is no separate per-transition audit-log table.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class GrievanceServiceImpl implements GrievanceService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final DateTimeFormatter DATE_TAG = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(IST);

    private final GrievanceRepository grievanceRepository;
    private final AllocationRepository allocationRepository;
    private final OrgIsolationGuard orgIsolationGuard;

    @Value("${app.grievance.acknowledgement-sla-days:3}")
    private int acknowledgementSlaDays;

    @Value("${app.grievance.resolution-sla-days:30}")
    private int resolutionSlaDays;

    @Override
    public GrievanceResponse raise(RaiseGrievanceRequest request, UUID organizationId, UUID actingUserId) {
        if (request.getAllocationId() != null) {
            Allocation allocation = allocationRepository.findByIdAndIsDeletedFalse(request.getAllocationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Allocation", request.getAllocationId()));
            if (!allocation.getOrganization().getId().equals(organizationId)) {
                throw new ResourceNotFoundException("Allocation", request.getAllocationId());
            }
        }

        Instant now = Instant.now();
        Grievance grievance = Grievance.builder()
                .ticketNumber(generateUniqueTicketNumber())
                .organizationId(organizationId)
                .allocationId(request.getAllocationId())
                .raisedByUserId(actingUserId)
                .borrowerName(request.getBorrowerName())
                .borrowerEmail(request.getBorrowerEmail())
                .borrowerPhone(request.getBorrowerPhone())
                .category(request.getCategory())
                .subject(request.getSubject())
                .description(request.getDescription())
                .evidenceUrl(request.getEvidenceUrl())
                .status(GrievanceStatus.RECEIVED)
                .acknowledgementDueAt(now.plus(acknowledgementSlaDays, ChronoUnit.DAYS))
                .resolutionDueAt(now.plus(resolutionSlaDays, ChronoUnit.DAYS))
                .build();

        Grievance saved = grievanceRepository.save(grievance);
        log.info("Grievance raised: ticket={}, org={}, category={}",
                saved.getTicketNumber(), organizationId, saved.getCategory());
        return toResponse(saved);
    }

    @Override
    public GrievanceResponse acknowledge(UUID id, AcknowledgeGrievanceRequest request, UUID actingUserId) {
        Grievance grievance = requireById(id);
        requireStatus(grievance, GrievanceStatus.RECEIVED);

        grievance.setStatus(GrievanceStatus.ACKNOWLEDGED);
        grievance.setAcknowledgedAt(Instant.now());
        Grievance saved = grievanceRepository.save(grievance);
        log.info("Grievance acknowledged: ticket={}, by={}", saved.getTicketNumber(), actingUserId);
        return toResponse(saved);
    }

    @Override
    public GrievanceResponse investigate(UUID id, InvestigateGrievanceRequest request, UUID actingUserId) {
        Grievance grievance = requireById(id);
        requireStatus(grievance, GrievanceStatus.ACKNOWLEDGED);

        grievance.setStatus(GrievanceStatus.INVESTIGATING);
        grievance.setAssignedToUserId(
                request.getAssignedToUserId() != null ? request.getAssignedToUserId() : actingUserId);
        Grievance saved = grievanceRepository.save(grievance);
        log.info("Grievance investigation started: ticket={}, assignedTo={}, by={}",
                saved.getTicketNumber(), saved.getAssignedToUserId(), actingUserId);
        return toResponse(saved);
    }

    @Override
    public GrievanceResponse escalate(UUID id, EscalateGrievanceRequest request, UUID actingUserId) {
        Grievance grievance = requireById(id);
        requireOneOf(grievance, GrievanceStatus.ACKNOWLEDGED, GrievanceStatus.INVESTIGATING);

        grievance.setStatus(GrievanceStatus.ESCALATED);
        Grievance saved = grievanceRepository.save(grievance);
        log.info("Grievance escalated: ticket={}, by={}, remarks={}",
                saved.getTicketNumber(), actingUserId, request.getRemarks());
        return toResponse(saved);
    }

    @Override
    public GrievanceResponse resolve(UUID id, ResolveGrievanceRequest request, UUID actingUserId) {
        Grievance grievance = requireById(id);
        requireOneOf(grievance, GrievanceStatus.INVESTIGATING, GrievanceStatus.ESCALATED);

        grievance.setStatus(GrievanceStatus.RESOLVED);
        grievance.setResolvedAt(Instant.now());
        grievance.setResolutionNotes(request.getResolutionNotes());
        Grievance saved = grievanceRepository.save(grievance);
        log.info("Grievance resolved: ticket={}, by={}", saved.getTicketNumber(), actingUserId);
        return toResponse(saved);
    }

    @Override
    public GrievanceResponse close(UUID id, UUID actingUserId) {
        Grievance grievance = requireById(id);
        requireStatus(grievance, GrievanceStatus.RESOLVED);

        grievance.setStatus(GrievanceStatus.CLOSED);
        grievance.setClosedAt(Instant.now());
        Grievance saved = grievanceRepository.save(grievance);
        log.info("Grievance closed: ticket={}, by={}", saved.getTicketNumber(), actingUserId);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public GrievanceResponse getById(UUID id) {
        return toResponse(requireById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<GrievanceResponse> getByAllocationId(UUID allocationId) {
        return grievanceRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GrievanceResponse> getByOrganization(UUID organizationId, GrievanceStatus status, Pageable pageable) {
        Page<Grievance> page = status == null
                ? grievanceRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId, pageable)
                : grievanceRepository.findByOrganizationIdAndStatusOrderByCreatedAtDesc(organizationId, status, pageable);
        return page.map(this::toResponse);
    }

    private Grievance requireById(UUID id) {
        Grievance grievance = grievanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Grievance", id));
        if (!orgIsolationGuard.belongsToOrg(grievance.getOrganizationId())) {
            throw new ResourceNotFoundException("Grievance", id);
        }
        return grievance;
    }

    private void requireStatus(Grievance grievance, GrievanceStatus expected) {
        if (grievance.getStatus() != expected) {
            throw new BusinessException(
                    "Grievance %s is in status %s, expected %s"
                            .formatted(grievance.getTicketNumber(), grievance.getStatus(), expected));
        }
    }

    private void requireOneOf(Grievance grievance, GrievanceStatus... allowed) {
        for (GrievanceStatus s : allowed) {
            if (grievance.getStatus() == s) return;
        }
        throw new BusinessException(
                "Grievance %s is in status %s, which does not allow this action"
                        .formatted(grievance.getTicketNumber(), grievance.getStatus()));
    }

    private String generateUniqueTicketNumber() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = "GRV-" + DATE_TAG.format(Instant.now()) + "-" + randomAlnum(6);
            if (!grievanceRepository.existsByTicketNumber(candidate)) return candidate;
        }
        return "GRV-" + DATE_TAG.format(Instant.now()) + "-" + randomAlnum(10);
    }

    private static String randomAlnum(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return sb.toString();
    }

    private GrievanceResponse toResponse(Grievance g) {
        return GrievanceResponse.builder()
                .id(g.getId())
                .ticketNumber(g.getTicketNumber())
                .organizationId(g.getOrganizationId())
                .allocationId(g.getAllocationId())
                .raisedByUserId(g.getRaisedByUserId())
                .borrowerName(g.getBorrowerName())
                .borrowerEmail(g.getBorrowerEmail())
                .borrowerPhone(g.getBorrowerPhone())
                .category(g.getCategory())
                .subject(g.getSubject())
                .description(g.getDescription())
                .evidenceUrl(g.getEvidenceUrl())
                .status(g.getStatus())
                .assignedToUserId(g.getAssignedToUserId())
                .resolutionNotes(g.getResolutionNotes())
                .acknowledgementDueAt(g.getAcknowledgementDueAt())
                .acknowledgedAt(g.getAcknowledgedAt())
                .resolutionDueAt(g.getResolutionDueAt())
                .resolvedAt(g.getResolvedAt())
                .closedAt(g.getClosedAt())
                .createdAt(g.getCreatedAt())
                .updatedAt(g.getUpdatedAt())
                .build();
    }
}
