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
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.GrievanceCategory;
import com.recoverpro.server.enums.GrievanceStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.GrievanceRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GrievanceServiceImplTest {

    @Mock private GrievanceRepository grievanceRepository;
    @Mock private AllocationRepository allocationRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private GrievanceServiceImpl service;

    private UUID orgId;
    private UUID allocationId;
    private UUID userId;

    @BeforeEach
    void setUp() throws ReflectiveOperationException {
        service = new GrievanceServiceImpl(grievanceRepository, allocationRepository, orgIsolationGuard);
        setIntField("acknowledgementSlaDays", 3);
        setIntField("resolutionSlaDays", 30);

        lenient().when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        orgId = UUID.randomUUID();
        allocationId = UUID.randomUUID();
        userId = UUID.randomUUID();
        lenient().when(grievanceRepository.save(any(Grievance.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(grievanceRepository.existsByTicketNumber(any())).thenReturn(false);
    }

    private void setIntField(String name, int value) throws ReflectiveOperationException {
        var field = GrievanceServiceImpl.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(service, value);
    }

    private RaiseGrievanceRequest raiseRequest(UUID allocationId) {
        RaiseGrievanceRequest request = new RaiseGrievanceRequest();
        request.setAllocationId(allocationId);
        request.setBorrowerName("Test Borrower");
        request.setCategory(GrievanceCategory.HARASSMENT);
        request.setSubject("Agent called at odd hours");
        request.setDescription("Borrower complained about a 9pm call.");
        return request;
    }

    private Allocation allocationFixture() {
        Organization org = new Organization();
        org.setId(orgId);
        return Allocation.builder().id(allocationId).organization(org).isDeleted(false).build();
    }

    @Test
    void raise_generatesTicketNumberAndComputesSlaDueDates() {
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId))
                .thenReturn(Optional.of(allocationFixture()));

        Instant before = Instant.now();
        GrievanceResponse response = service.raise(raiseRequest(allocationId), orgId, userId);
        Instant after = Instant.now();

        assertThat(response.getTicketNumber()).startsWith("GRV-");
        assertThat(response.getStatus()).isEqualTo(GrievanceStatus.RECEIVED);
        assertThat(response.getOrganizationId()).isEqualTo(orgId);
        assertThat(response.getRaisedByUserId()).isEqualTo(userId);
        assertThat(response.getAcknowledgementDueAt()).isBetween(
                before.plusSeconds(3 * 86400 - 5), after.plusSeconds(3 * 86400 + 5));
        assertThat(response.getResolutionDueAt()).isBetween(
                before.plusSeconds(30 * 86400 - 5), after.plusSeconds(30 * 86400 + 5));
    }

    @Test
    void raise_withoutAllocationId_stillSucceeds() {
        RaiseGrievanceRequest request = raiseRequest(null);

        GrievanceResponse response = service.raise(request, orgId, userId);

        assertThat(response.getAllocationId()).isNull();
        verify(allocationRepository, never()).findByIdAndIsDeletedFalse(any());
    }

    @Test
    void raise_allocationBelongsToForeignOrg_throwsResourceNotFoundException() {
        Organization foreignOrg = new Organization();
        foreignOrg.setId(UUID.randomUUID());
        Allocation foreignAllocation = Allocation.builder().id(allocationId).organization(foreignOrg).isDeleted(false).build();
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId)).thenReturn(Optional.of(foreignAllocation));

        assertThatThrownBy(() -> service.raise(raiseRequest(allocationId), orgId, userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void raise_allocationNotFound_throwsResourceNotFoundException() {
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.raise(raiseRequest(allocationId), orgId, userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void raise_ticketNumberCollision_retriesUntilUnique() {
        when(grievanceRepository.existsByTicketNumber(any())).thenReturn(true, true, false);

        GrievanceResponse response = service.raise(raiseRequest(null), orgId, userId);

        assertThat(response.getTicketNumber()).startsWith("GRV-");
        verify(grievanceRepository, times(3)).existsByTicketNumber(any());
    }

    @Test
    void acknowledge_fromReceived_setsAcknowledgedAtWithoutAssigning() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.RECEIVED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        GrievanceResponse response = service.acknowledge(grievance.getId(), new AcknowledgeGrievanceRequest(), userId);

        assertThat(response.getStatus()).isEqualTo(GrievanceStatus.ACKNOWLEDGED);
        assertThat(response.getAcknowledgedAt()).isNotNull();
        assertThat(response.getAssignedToUserId()).isNull();
    }

    @Test
    void acknowledge_wrongStatus_throwsBusinessException() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.CLOSED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        assertThatThrownBy(() -> service.acknowledge(grievance.getId(), new AcknowledgeGrievanceRequest(), userId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void investigate_fromAcknowledged_defaultsAssigneeToActingUser() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.ACKNOWLEDGED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        GrievanceResponse response = service.investigate(grievance.getId(), new InvestigateGrievanceRequest(), userId);

        assertThat(response.getStatus()).isEqualTo(GrievanceStatus.INVESTIGATING);
        assertThat(response.getAssignedToUserId()).isEqualTo(userId);
    }

    @Test
    void investigate_withExplicitAssignee_usesProvidedAssignee() {
        UUID otherHandler = UUID.randomUUID();
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.ACKNOWLEDGED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        InvestigateGrievanceRequest request = new InvestigateGrievanceRequest();
        request.setAssignedToUserId(otherHandler);
        GrievanceResponse response = service.investigate(grievance.getId(), request, userId);

        assertThat(response.getAssignedToUserId()).isEqualTo(otherHandler);
    }

    @Test
    void investigate_fromReceived_throwsBusinessException() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.RECEIVED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        assertThatThrownBy(() -> service.investigate(grievance.getId(), new InvestigateGrievanceRequest(), userId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void escalate_fromAcknowledged_succeeds() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.ACKNOWLEDGED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        EscalateGrievanceRequest request = new EscalateGrievanceRequest();
        request.setRemarks("Needs GRO attention");
        GrievanceResponse response = service.escalate(grievance.getId(), request, userId);

        assertThat(response.getStatus()).isEqualTo(GrievanceStatus.ESCALATED);
    }

    @Test
    void escalate_fromInvestigating_succeeds() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.INVESTIGATING).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        GrievanceResponse response = service.escalate(grievance.getId(), new EscalateGrievanceRequest(), userId);

        assertThat(response.getStatus()).isEqualTo(GrievanceStatus.ESCALATED);
    }

    @Test
    void escalate_fromReceived_throwsBusinessException() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.RECEIVED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        assertThatThrownBy(() -> service.escalate(grievance.getId(), new EscalateGrievanceRequest(), userId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void resolve_fromInvestigating_succeeds() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.INVESTIGATING).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        ResolveGrievanceRequest request = new ResolveGrievanceRequest();
        request.setResolutionNotes("Refunded the excess amount");
        GrievanceResponse response = service.resolve(grievance.getId(), request, userId);

        assertThat(response.getStatus()).isEqualTo(GrievanceStatus.RESOLVED);
        assertThat(response.getResolvedAt()).isNotNull();
        assertThat(response.getResolutionNotes()).isEqualTo("Refunded the excess amount");
    }

    @Test
    void resolve_fromEscalated_succeeds() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.ESCALATED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        ResolveGrievanceRequest request = new ResolveGrievanceRequest();
        request.setResolutionNotes("GRO reviewed and closed out with borrower");
        GrievanceResponse response = service.resolve(grievance.getId(), request, userId);

        assertThat(response.getStatus()).isEqualTo(GrievanceStatus.RESOLVED);
    }

    @Test
    void resolve_fromReceived_throwsBusinessException() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.RECEIVED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        ResolveGrievanceRequest request = new ResolveGrievanceRequest();
        request.setResolutionNotes("too early");
        assertThatThrownBy(() -> service.resolve(grievance.getId(), request, userId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void close_fromResolved_succeeds() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.RESOLVED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        GrievanceResponse response = service.close(grievance.getId(), userId);

        assertThat(response.getStatus()).isEqualTo(GrievanceStatus.CLOSED);
        assertThat(response.getClosedAt()).isNotNull();
    }

    @Test
    void close_fromReceived_throwsBusinessException() {
        Grievance grievance = Grievance.builder()
                .id(UUID.randomUUID()).organizationId(orgId).status(GrievanceStatus.RECEIVED).build();
        when(grievanceRepository.findById(grievance.getId())).thenReturn(Optional.of(grievance));

        assertThatThrownBy(() -> service.close(grievance.getId(), userId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(grievanceRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getById_foreignOrg_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(orgIsolationGuard.belongsToOrg(any())).thenReturn(false);
        when(grievanceRepository.findById(id)).thenReturn(Optional.of(
                Grievance.builder().id(id).organizationId(UUID.randomUUID()).status(GrievanceStatus.RECEIVED).build()));

        assertThatThrownBy(() -> service.getById(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
