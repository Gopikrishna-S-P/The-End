package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.AllocationResponse;
import com.recoverpro.server.dto.response.CaseEventResponse;
import com.recoverpro.server.dto.response.CaseTimelineResponse;
import com.recoverpro.server.dto.response.RestructureProposalResponse;
import com.recoverpro.server.entity.AllocationAuditLog;
import com.recoverpro.server.entity.AssignmentAuditLog;
import com.recoverpro.server.entity.CollectionAuditLog;
import com.recoverpro.server.entity.Grievance;
import com.recoverpro.server.entity.PtpAuditLog;
import com.recoverpro.server.entity.SettlementAuditLog;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.CaseEventType;
import com.recoverpro.server.repository.AllocationAuditLogRepository;
import com.recoverpro.server.repository.AssignmentAuditLogRepository;
import com.recoverpro.server.repository.CollectionAuditLogRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.GrievanceRepository;
import com.recoverpro.server.repository.PtpAuditLogRepository;
import com.recoverpro.server.repository.SettlementAuditLogRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.AllocationService;
import com.recoverpro.server.service.CaseTimelineService;
import com.recoverpro.server.service.RestructureProposalService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Aggregates a case's history from the domain-specific audit logs that
 * already exist (AllocationAuditLog, AssignmentAuditLog, PtpAuditLog,
 * CollectionAuditLog) plus RestructureProposal's own lifecycle timestamps.
 * Deliberately does NOT emit PTP_CREATED or any VISIT_* type --
 * CaseTimeline.tsx already synthesizes those client-side from the
 * visits/ptps endpoints it calls directly, so including them here would
 * duplicate entries in the UI.
 *
 * Several CaseEventType values (NPA/cooling-off changes, communications, PTP reschedule,
 * assignment "completed") still have no audit trail anywhere in this codebase and are never
 * produced -- see CaseEventType's javadoc. SETTLEMENT_OFFERED/ACCEPTED/DECLINED, previously in
 * that same "never produced" list, are now sourced from settlement_audit_logs (added alongside
 * the settlement_offers feature, 2026-08-04) -- SETTLEMENT_DRAFTED/APPROVED/EXPIRED/PAID have no
 * corresponding CaseEventType values to map onto and are intentionally not emitted here.
 * GRIEVANCE_RAISED/RESOLVED are sourced directly from grievances rows (no separate audit table --
 * see GrievanceServiceImpl), added alongside the grievances feature (2026-08-04); only grievances
 * with a non-null allocation_id are relevant to a given case's timeline.
 */
@Service
@RequiredArgsConstructor
public class CaseTimelineServiceImpl implements CaseTimelineService {

    private final AllocationService allocationService;
    private final AllocationAuditLogRepository allocationAuditLogRepository;
    private final AssignmentAuditLogRepository assignmentAuditLogRepository;
    private final PtpAuditLogRepository ptpAuditLogRepository;
    private final CollectionAuditLogRepository collectionAuditLogRepository;
    private final CollectionRepository collectionRepository;
    private final RestructureProposalService restructureProposalService;
    private final SettlementAuditLogRepository settlementAuditLogRepository;
    private final GrievanceRepository grievanceRepository;
    private final UserRepository userRepository;

    @Override
    public CaseTimelineResponse getTimeline(UUID allocationId) {
        AllocationResponse allocation = allocationService.getAllocationById(allocationId);

        List<AssignmentAuditLog> assignmentLogs =
                assignmentAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId, Pageable.unpaged()).getContent();

        List<PtpAuditLog> ptpLogs = ptpAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId);

        List<UUID> collectionIds = collectionRepository
                .findByAllocationIdAndIsDeletedFalseOrderByCreatedAtDesc(allocationId)
                .stream().map(com.recoverpro.server.entity.Collection::getId).toList();
        List<CollectionAuditLog> collectionLogs = collectionIds.isEmpty()
                ? List.of()
                : collectionAuditLogRepository.findByCollectionIdInOrderByCreatedAtDesc(collectionIds);

        List<AllocationAuditLog> allocationAuditLogs =
                allocationAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId);

        List<RestructureProposalResponse> restructures = restructureProposalService.getByAllocationId(allocationId);

        List<SettlementAuditLog> settlementLogs =
                settlementAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId);

        List<Grievance> grievances = grievanceRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId);

        Map<UUID, User> usersById = resolveUsers(assignmentLogs, ptpLogs, collectionLogs, allocationAuditLogs,
                restructures, settlementLogs, grievances);

        List<CaseEventResponse> events = new ArrayList<>();

        if (allocation.getCreatedAt() != null) {
            events.add(CaseEventResponse.builder()
                    .timestamp(allocation.getCreatedAt())
                    .eventType(CaseEventType.ALLOCATION_CREATED)
                    .summary("Case created")
                    .sourceTable("ALLOCATION")
                    .sourceId(allocationId)
                    .build());
        }

        for (AllocationAuditLog log : allocationAuditLogs) {
            CaseEventType type = switch (log.getAction()) {
                case "STATUS_CHANGED" -> CaseEventType.ALLOCATION_STATUS_CHANGED;
                case "DISPOSITION_CHANGED" -> CaseEventType.ALLOCATION_DISPOSITION_CHANGED;
                default -> null;
            };
            if (type == null) continue;

            String label = type == CaseEventType.ALLOCATION_STATUS_CHANGED ? "Status" : "Disposition";
            String summary = label + " changed"
                    + (log.getPreviousValue() != null ? " from " + log.getPreviousValue() : "")
                    + " to " + log.getNewValue();

            events.add(CaseEventResponse.builder()
                    .timestamp(log.getCreatedAt())
                    .eventType(type)
                    .summary(summary)
                    .actorId(log.getPerformedBy())
                    .actorName(displayName(usersById.get(log.getPerformedBy())))
                    .actorRole(roleOf(usersById.get(log.getPerformedBy())))
                    .sourceTable("ALLOCATION_AUDIT_LOG")
                    .sourceId(log.getId())
                    .narrative(log.getReason())
                    .build());
        }

        for (AssignmentAuditLog log : assignmentLogs) {
            CaseEventType type = switch (log.getAction()) {
                case "ASSIGNED" -> CaseEventType.ASSIGNMENT_CREATED;
                case "REASSIGNED" -> CaseEventType.ASSIGNMENT_REASSIGNED;
                case "CANCELLED", "DELETED" -> CaseEventType.ASSIGNMENT_CANCELLED;
                default -> null;
            };
            if (type == null) continue;

            String summary = switch (type) {
                case ASSIGNMENT_CREATED -> "Assigned to " + displayName(usersById.get(log.getNewAgentId()));
                case ASSIGNMENT_REASSIGNED -> "Reassigned from " + displayName(usersById.get(log.getPreviousAgentId()))
                        + " to " + displayName(usersById.get(log.getNewAgentId()));
                default -> "Assignment cancelled";
            };

            events.add(CaseEventResponse.builder()
                    .timestamp(log.getCreatedAt())
                    .eventType(type)
                    .summary(summary)
                    .actorId(log.getPerformedBy())
                    .actorName(displayName(usersById.get(log.getPerformedBy())))
                    .actorRole(roleOf(usersById.get(log.getPerformedBy())))
                    .sourceTable("ASSIGNMENT_AUDIT_LOG")
                    .sourceId(log.getId())
                    .narrative(log.getReason())
                    .build());
        }

        for (PtpAuditLog log : ptpLogs) {
            if (!"STATUS_CHANGED".equals(log.getAction())) continue;
            CaseEventType type = mapPtpStatus(log.getNewStatus());
            if (type == null) continue;

            events.add(CaseEventResponse.builder()
                    .timestamp(log.getCreatedAt())
                    .eventType(type)
                    .summary("PTP " + log.getNewStatus().toLowerCase().replace('_', ' '))
                    .actorId(log.getPerformedBy())
                    .actorName(displayName(usersById.get(log.getPerformedBy())))
                    .actorRole(roleOf(usersById.get(log.getPerformedBy())))
                    .sourceTable("PTP_AUDIT_LOG")
                    .sourceId(log.getId())
                    .narrative(log.getReason())
                    .build());
        }

        for (CollectionAuditLog log : collectionLogs) {
            CaseEventType type = switch (log.getAction()) {
                case "SUBMITTED" -> CaseEventType.COLLECTION_SUBMITTED;
                case "APPROVED" -> CaseEventType.COLLECTION_APPROVED;
                case "REJECTED" -> CaseEventType.COLLECTION_REJECTED;
                case "DEPOSITED" -> CaseEventType.COLLECTION_DEPOSITED;
                case "CANCELLED" -> CaseEventType.COLLECTION_CANCELLED;
                default -> null;
            };
            if (type == null) continue;

            events.add(CaseEventResponse.builder()
                    .timestamp(log.getCreatedAt())
                    .eventType(type)
                    .summary(collectionSummary(type))
                    .actorId(log.getPerformedBy())
                    .actorName(displayName(usersById.get(log.getPerformedBy())))
                    .actorRole(roleOf(usersById.get(log.getPerformedBy())))
                    .sourceTable("COLLECTION_AUDIT_LOG")
                    .sourceId(log.getId())
                    .narrative(log.getRemarks())
                    .build());
        }

        for (RestructureProposalResponse r : restructures) {
            if (r.getProposedToLenderAt() != null) {
                events.add(CaseEventResponse.builder()
                        .timestamp(r.getProposedToLenderAt())
                        .eventType(CaseEventType.RESTRUCTURE_PROPOSED)
                        .summary("Restructure proposed to lender")
                        .actorId(r.getDraftedByUserId())
                        .actorName(displayName(usersById.get(r.getDraftedByUserId())))
                        .actorRole(roleOf(usersById.get(r.getDraftedByUserId())))
                        .sourceTable("RESTRUCTURE_PROPOSAL")
                        .sourceId(r.getId())
                        .narrative(r.getRationale())
                        .build());
            }
            if (r.getLenderApprovalAt() != null) {
                events.add(CaseEventResponse.builder()
                        .timestamp(r.getLenderApprovalAt())
                        .eventType(CaseEventType.RESTRUCTURE_APPROVED)
                        .summary("Restructure approved by lender")
                        .actorId(r.getLenderApprovalUserId())
                        .actorName(displayName(usersById.get(r.getLenderApprovalUserId())))
                        .actorRole(roleOf(usersById.get(r.getLenderApprovalUserId())))
                        .sourceTable("RESTRUCTURE_PROPOSAL")
                        .sourceId(r.getId())
                        .build());
            }
            if (r.getRejectedAt() != null) {
                events.add(CaseEventResponse.builder()
                        .timestamp(r.getRejectedAt())
                        .eventType(CaseEventType.RESTRUCTURE_REJECTED)
                        .summary("Restructure rejected")
                        .actorId(r.getRejectedByUserId())
                        .actorName(displayName(usersById.get(r.getRejectedByUserId())))
                        .actorRole(roleOf(usersById.get(r.getRejectedByUserId())))
                        .sourceTable("RESTRUCTURE_PROPOSAL")
                        .sourceId(r.getId())
                        .narrative(r.getRejectionReason())
                        .build());
            }
        }

        for (SettlementAuditLog log : settlementLogs) {
            CaseEventType type = switch (log.getAction()) {
                case "PROPOSED" -> CaseEventType.SETTLEMENT_OFFERED;
                case "BORROWER_ACCEPTED" -> CaseEventType.SETTLEMENT_ACCEPTED;
                case "REJECTED" -> CaseEventType.SETTLEMENT_DECLINED;
                default -> null;
            };
            if (type == null) continue;

            String summary = switch (type) {
                case SETTLEMENT_OFFERED -> "Settlement offer presented to borrower";
                case SETTLEMENT_ACCEPTED -> "Settlement offer accepted by borrower";
                default -> "Settlement offer declined";
            };

            events.add(CaseEventResponse.builder()
                    .timestamp(log.getCreatedAt())
                    .eventType(type)
                    .summary(summary)
                    .actorId(log.getPerformedBy())
                    .actorName(displayName(usersById.get(log.getPerformedBy())))
                    .actorRole(roleOf(usersById.get(log.getPerformedBy())))
                    .sourceTable("SETTLEMENT_AUDIT_LOG")
                    .sourceId(log.getId())
                    .narrative(log.getRemarks())
                    .build());
        }

        for (Grievance g : grievances) {
            events.add(CaseEventResponse.builder()
                    .timestamp(g.getCreatedAt())
                    .eventType(CaseEventType.GRIEVANCE_RAISED)
                    .summary("Grievance raised (" + g.getTicketNumber() + "): " + g.getSubject())
                    .actorId(g.getRaisedByUserId())
                    .actorName(displayName(usersById.get(g.getRaisedByUserId())))
                    .actorRole(roleOf(usersById.get(g.getRaisedByUserId())))
                    .sourceTable("GRIEVANCE")
                    .sourceId(g.getId())
                    .build());

            if (g.getResolvedAt() != null) {
                events.add(CaseEventResponse.builder()
                        .timestamp(g.getResolvedAt())
                        .eventType(CaseEventType.GRIEVANCE_RESOLVED)
                        .summary("Grievance resolved (" + g.getTicketNumber() + ")")
                        .actorId(g.getAssignedToUserId())
                        .actorName(displayName(usersById.get(g.getAssignedToUserId())))
                        .actorRole(roleOf(usersById.get(g.getAssignedToUserId())))
                        .sourceTable("GRIEVANCE")
                        .sourceId(g.getId())
                        .narrative(g.getResolutionNotes())
                        .build());
            }
        }

        events.sort(Comparator.comparing(CaseEventResponse::getTimestamp).reversed());

        return CaseTimelineResponse.builder()
                .allocationId(allocationId)
                .organizationId(allocation.getOrganizationId())
                .loanNumber(allocation.getLoanNumber())
                .borrowerName(allocation.getBorrowerName())
                .currentStatus(allocation.getStatus())
                .npaFlagged(allocation.getNpaFlagged())
                .totalDue(allocation.getTotalDue())
                .outstandingAmount(allocation.getOutstandingAmount())
                .events(events)
                .build();
    }

    private Map<UUID, User> resolveUsers(List<AssignmentAuditLog> assignmentLogs, List<PtpAuditLog> ptpLogs,
                                          List<CollectionAuditLog> collectionLogs, List<AllocationAuditLog> allocationAuditLogs,
                                          List<RestructureProposalResponse> restructures,
                                          List<SettlementAuditLog> settlementLogs, List<Grievance> grievances) {
        Set<UUID> ids = new HashSet<>();
        for (AssignmentAuditLog a : assignmentLogs) {
            ids.add(a.getPerformedBy());
            ids.add(a.getPreviousAgentId());
            ids.add(a.getNewAgentId());
        }
        for (PtpAuditLog p : ptpLogs) ids.add(p.getPerformedBy());
        for (CollectionAuditLog c : collectionLogs) ids.add(c.getPerformedBy());
        for (AllocationAuditLog a : allocationAuditLogs) ids.add(a.getPerformedBy());
        for (RestructureProposalResponse r : restructures) {
            ids.add(r.getDraftedByUserId());
            ids.add(r.getLenderApprovalUserId());
            ids.add(r.getRejectedByUserId());
        }
        for (SettlementAuditLog s : settlementLogs) ids.add(s.getPerformedBy());
        for (Grievance g : grievances) {
            ids.add(g.getRaisedByUserId());
            ids.add(g.getAssignedToUserId());
        }
        ids.remove(null);
        if (ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids).stream().collect(Collectors.toMap(User::getId, u -> u));
    }

    private static CaseEventType mapPtpStatus(String newStatus) {
        if (newStatus == null) return null;
        return switch (newStatus) {
            case "FULFILLED" -> CaseEventType.PTP_FULFILLED;
            case "PARTIALLY_FULFILLED" -> CaseEventType.PTP_PARTIALLY_FULFILLED;
            case "BROKEN" -> CaseEventType.PTP_BROKEN;
            case "CANCELLED" -> CaseEventType.PTP_CANCELLED;
            default -> null;
        };
    }

    private static String collectionSummary(CaseEventType type) {
        return switch (type) {
            case COLLECTION_SUBMITTED -> "Collection submitted";
            case COLLECTION_APPROVED -> "Collection approved";
            case COLLECTION_REJECTED -> "Collection rejected";
            case COLLECTION_DEPOSITED -> "Collection deposited";
            case COLLECTION_CANCELLED -> "Collection cancelled";
            default -> "Collection updated";
        };
    }

    private static String displayName(User u) {
        if (u == null) return "Unknown";
        String name = ((u.getFirstName() == null ? "" : u.getFirstName()) + " " + (u.getLastName() == null ? "" : u.getLastName())).trim();
        return name.isEmpty() ? u.getEmail() : name;
    }

    private static String roleOf(User u) {
        if (u == null || u.getRoles() == null || u.getRoles().isEmpty()) return null;
        return u.getRoles().iterator().next().getName().replace("ROLE_", "");
    }
}
