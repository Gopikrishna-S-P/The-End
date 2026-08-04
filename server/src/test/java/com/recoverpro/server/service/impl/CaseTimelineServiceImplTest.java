package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.AllocationResponse;
import com.recoverpro.server.dto.response.CaseEventResponse;
import com.recoverpro.server.dto.response.CaseTimelineResponse;
import com.recoverpro.server.dto.response.RestructureProposalResponse;
import com.recoverpro.server.entity.AllocationAuditLog;
import com.recoverpro.server.entity.AssignmentAuditLog;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.entity.CollectionAuditLog;
import com.recoverpro.server.entity.Grievance;
import com.recoverpro.server.entity.PtpAuditLog;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.SettlementAuditLog;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.CaseEventType;
import com.recoverpro.server.enums.GrievanceCategory;
import com.recoverpro.server.enums.GrievanceStatus;
import com.recoverpro.server.repository.AllocationAuditLogRepository;
import com.recoverpro.server.repository.AssignmentAuditLogRepository;
import com.recoverpro.server.repository.CollectionAuditLogRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.GrievanceRepository;
import com.recoverpro.server.repository.PtpAuditLogRepository;
import com.recoverpro.server.repository.SettlementAuditLogRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.AllocationService;
import com.recoverpro.server.service.RestructureProposalService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CaseTimelineServiceImplTest {

    @Mock private AllocationService allocationService;
    @Mock private AllocationAuditLogRepository allocationAuditLogRepository;
    @Mock private AssignmentAuditLogRepository assignmentAuditLogRepository;
    @Mock private PtpAuditLogRepository ptpAuditLogRepository;
    @Mock private CollectionAuditLogRepository collectionAuditLogRepository;
    @Mock private CollectionRepository collectionRepository;
    @Mock private RestructureProposalService restructureProposalService;
    @Mock private SettlementAuditLogRepository settlementAuditLogRepository;
    @Mock private GrievanceRepository grievanceRepository;
    @Mock private UserRepository userRepository;

    private CaseTimelineServiceImpl newService() {
        return new CaseTimelineServiceImpl(allocationService, allocationAuditLogRepository,
                assignmentAuditLogRepository, ptpAuditLogRepository, collectionAuditLogRepository,
                collectionRepository, restructureProposalService, settlementAuditLogRepository,
                grievanceRepository, userRepository);
    }

    private void stubEmptyDefaults(UUID allocationId) {
        lenient().when(assignmentAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(eq(allocationId), any(Pageable.class)))
                .thenReturn(Page.empty());
        lenient().when(ptpAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)).thenReturn(List.of());
        lenient().when(collectionRepository.findByAllocationIdAndIsDeletedFalseOrderByCreatedAtDesc(allocationId)).thenReturn(List.of());
        lenient().when(allocationAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)).thenReturn(List.of());
        lenient().when(restructureProposalService.getByAllocationId(allocationId)).thenReturn(List.of());
        lenient().when(settlementAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)).thenReturn(List.of());
        lenient().when(grievanceRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)).thenReturn(List.of());
    }

    @Test
    void getTimeline_allocationCreatedAlwaysIncluded() {
        UUID allocationId = UUID.randomUUID();
        Instant createdAt = Instant.now().minus(10, ChronoUnit.DAYS);
        stubEmptyDefaults(allocationId);
        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID()).createdAt(createdAt).build());

        CaseTimelineResponse result = newService().getTimeline(allocationId);

        assertThat(result.getEvents()).hasSize(1);
        assertThat(result.getEvents().get(0).getEventType()).isEqualTo(CaseEventType.ALLOCATION_CREATED);
        assertThat(result.getEvents().get(0).getTimestamp()).isEqualTo(createdAt);
    }

    @Test
    void getTimeline_unmappedAuditActionIsSkipped() {
        UUID allocationId = UUID.randomUUID();
        stubEmptyDefaults(allocationId);
        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID()).build());
        when(allocationAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)).thenReturn(List.of(
                AllocationAuditLog.builder().id(UUID.randomUUID()).allocationId(allocationId)
                        .action("SOMETHING_UNMAPPED").createdAt(Instant.now()).build()));

        CaseTimelineResponse result = newService().getTimeline(allocationId);

        assertThat(result.getEvents()).isEmpty();
    }

    @Test
    void getTimeline_ptpStatusChange_mapsToCorrectEventTypeAndResolvesActorName() {
        UUID allocationId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();
        stubEmptyDefaults(allocationId);
        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID()).build());

        Instant ts = Instant.now();
        when(ptpAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)).thenReturn(List.of(
                PtpAuditLog.builder().id(UUID.randomUUID()).ptpId(UUID.randomUUID()).allocationId(allocationId)
                        .action("STATUS_CHANGED").performedBy(agentId).previousStatus("PENDING")
                        .newStatus("FULFILLED").createdAt(ts).build()));

        Role foRole = Role.builder().id(UUID.randomUUID()).name("ROLE_FO").build();
        when(userRepository.findAllById(Set.of(agentId))).thenReturn(List.of(
                User.builder().id(agentId).firstName("Asha").lastName("Rao").roles(Set.of(foRole)).build()));

        CaseTimelineResponse result = newService().getTimeline(allocationId);

        assertThat(result.getEvents()).hasSize(1);
        CaseEventResponse ev = result.getEvents().get(0);
        assertThat(ev.getEventType()).isEqualTo(CaseEventType.PTP_FULFILLED);
        assertThat(ev.getActorName()).isEqualTo("Asha Rao");
        assertThat(ev.getActorRole()).isEqualTo("FO");
    }

    @Test
    void getTimeline_unknownActor_fallsBackToUnknownLabel() {
        UUID allocationId = UUID.randomUUID();
        UUID collectionId = UUID.randomUUID();
        UUID unknownUser = UUID.randomUUID();
        stubEmptyDefaults(allocationId);
        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID()).build());

        when(collectionRepository.findByAllocationIdAndIsDeletedFalseOrderByCreatedAtDesc(allocationId)).thenReturn(List.of(
                Collection.builder().id(collectionId).build()));
        when(collectionAuditLogRepository.findByCollectionIdInOrderByCreatedAtDesc(List.of(collectionId))).thenReturn(List.of(
                CollectionAuditLog.builder().id(UUID.randomUUID()).collectionId(collectionId)
                        .action("SUBMITTED").performedBy(unknownUser).createdAt(Instant.now()).build()));
        when(userRepository.findAllById(Set.of(unknownUser))).thenReturn(List.of());

        CaseTimelineResponse result = newService().getTimeline(allocationId);

        assertThat(result.getEvents()).hasSize(1);
        assertThat(result.getEvents().get(0).getEventType()).isEqualTo(CaseEventType.COLLECTION_SUBMITTED);
        assertThat(result.getEvents().get(0).getActorName()).isEqualTo("Unknown");
    }

    @Test
    void getTimeline_restructureLifecycle_emitsAllThreeTransitionsAndSortsDescending() {
        UUID allocationId = UUID.randomUUID();
        UUID proposalId = UUID.randomUUID();
        UUID lenderUser = UUID.randomUUID();
        stubEmptyDefaults(allocationId);

        Instant proposed = Instant.now().minus(5, ChronoUnit.DAYS);
        Instant approved = Instant.now().minus(3, ChronoUnit.DAYS);
        Instant allocationCreated = Instant.now().minus(30, ChronoUnit.DAYS);

        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID())
                        .createdAt(allocationCreated).build());
        when(restructureProposalService.getByAllocationId(allocationId)).thenReturn(List.of(
                RestructureProposalResponse.builder().id(proposalId)
                        .proposedToLenderAt(proposed).lenderApprovalAt(approved).lenderApprovalUserId(lenderUser)
                        .build()));
        when(userRepository.findAllById(Set.of(lenderUser))).thenReturn(List.of());

        CaseTimelineResponse result = newService().getTimeline(allocationId);

        assertThat(result.getEvents()).hasSize(3);
        assertThat(result.getEvents()).extracting(CaseEventResponse::getEventType)
                .containsExactly(CaseEventType.RESTRUCTURE_APPROVED, CaseEventType.RESTRUCTURE_PROPOSED, CaseEventType.ALLOCATION_CREATED);
    }

    @Test
    void getTimeline_settlementOfferActions_mapToCorrectEventTypesAndSkipsUnmapped() {
        UUID allocationId = UUID.randomUUID();
        UUID offerId = UUID.randomUUID();
        UUID staffUser = UUID.randomUUID();
        stubEmptyDefaults(allocationId);
        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID()).build());

        when(settlementAuditLogRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)).thenReturn(List.of(
                SettlementAuditLog.builder().id(UUID.randomUUID()).settlementOfferId(offerId).allocationId(allocationId)
                        .action("DRAFTED").performedBy(staffUser).createdAt(Instant.now().minus(2, ChronoUnit.DAYS)).build(),
                SettlementAuditLog.builder().id(UUID.randomUUID()).settlementOfferId(offerId).allocationId(allocationId)
                        .action("PROPOSED").performedBy(staffUser).createdAt(Instant.now().minus(1, ChronoUnit.DAYS)).build(),
                SettlementAuditLog.builder().id(UUID.randomUUID()).settlementOfferId(offerId).allocationId(allocationId)
                        .action("BORROWER_ACCEPTED").performedBy(staffUser).createdAt(Instant.now()).build()));
        when(userRepository.findAllById(Set.of(staffUser))).thenReturn(List.of());

        CaseTimelineResponse result = newService().getTimeline(allocationId);

        assertThat(result.getEvents()).hasSize(2);
        assertThat(result.getEvents()).extracting(CaseEventResponse::getEventType)
                .containsExactly(CaseEventType.SETTLEMENT_ACCEPTED, CaseEventType.SETTLEMENT_OFFERED);
    }

    @Test
    void getTimeline_grievance_emitsRaisedAlwaysAndResolvedOnlyWhenResolved() {
        UUID allocationId = UUID.randomUUID();
        UUID raisedBy = UUID.randomUUID();
        UUID assignedTo = UUID.randomUUID();
        stubEmptyDefaults(allocationId);
        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID()).build());

        Instant raisedAt = Instant.now().minus(5, ChronoUnit.DAYS);
        Instant resolvedAt = Instant.now().minus(1, ChronoUnit.DAYS);
        when(grievanceRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)).thenReturn(List.of(
                Grievance.builder().id(UUID.randomUUID()).ticketNumber("GRV-20260804-ABC123")
                        .allocationId(allocationId).raisedByUserId(raisedBy).assignedToUserId(assignedTo)
                        .category(GrievanceCategory.OTHER).subject("Test subject")
                        .status(GrievanceStatus.RESOLVED).resolutionNotes("Explained to borrower")
                        .createdAt(raisedAt).resolvedAt(resolvedAt).build()));
        when(userRepository.findAllById(Set.of(raisedBy, assignedTo))).thenReturn(List.of());

        CaseTimelineResponse result = newService().getTimeline(allocationId);

        assertThat(result.getEvents()).hasSize(2);
        assertThat(result.getEvents()).extracting(CaseEventResponse::getEventType)
                .containsExactly(CaseEventType.GRIEVANCE_RESOLVED, CaseEventType.GRIEVANCE_RAISED);
    }

    @Test
    void getTimeline_grievanceNotYetResolved_emitsOnlyRaised() {
        UUID allocationId = UUID.randomUUID();
        UUID raisedBy = UUID.randomUUID();
        stubEmptyDefaults(allocationId);
        when(allocationService.getAllocationById(allocationId)).thenReturn(
                AllocationResponse.builder().id(allocationId).organizationId(UUID.randomUUID()).build());

        when(grievanceRepository.findByAllocationIdOrderByCreatedAtDesc(allocationId)).thenReturn(List.of(
                Grievance.builder().id(UUID.randomUUID()).ticketNumber("GRV-20260804-XYZ789")
                        .allocationId(allocationId).raisedByUserId(raisedBy)
                        .category(GrievanceCategory.OTHER).subject("Still open")
                        .status(GrievanceStatus.RECEIVED).createdAt(Instant.now()).build()));
        when(userRepository.findAllById(Set.of(raisedBy))).thenReturn(List.of());

        CaseTimelineResponse result = newService().getTimeline(allocationId);

        assertThat(result.getEvents()).hasSize(1);
        assertThat(result.getEvents().get(0).getEventType()).isEqualTo(CaseEventType.GRIEVANCE_RAISED);
    }
}
