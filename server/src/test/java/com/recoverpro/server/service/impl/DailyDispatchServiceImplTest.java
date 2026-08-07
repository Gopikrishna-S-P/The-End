package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateDailyDispatchRequest;
import com.recoverpro.server.dto.response.AllocationResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.DailyVisitList;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.mapper.AllocationMapper;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.DailyVisitListRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyDispatchServiceImplTest {

    @Mock private DailyVisitListRepository dispatchRepo;
    @Mock private AllocationRepository allocationRepo;
    @Mock private AllocationMapper allocationMapper;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    private DailyDispatchServiceImpl service;
    private UUID orgId;
    private UUID agentId;
    private UUID actorId;
    private LocalDate date;

    @BeforeEach
    void setUp() {
        service = new DailyDispatchServiceImpl(dispatchRepo, allocationRepo, allocationMapper, userRepository, notificationService);
        orgId = UUID.randomUUID();
        agentId = UUID.randomUUID();
        actorId = UUID.randomUUID();
        date = LocalDate.of(2026, 7, 6);
        lenient().when(allocationMapper.toResponse(any())).thenReturn(AllocationResponse.builder().build());
        User agentUser = User.builder().id(agentId).organizationId(orgId).build();
        lenient().when(userRepository.findById(agentId)).thenReturn(Optional.of(agentUser));
    }

    private Allocation allocationInOrg(UUID id, UUID assignedTo) {
        Organization org = new Organization();
        org.setId(orgId);
        return Allocation.builder().id(id).organization(org).assignedToUserId(assignedTo).build();
    }

    @Test
    void createDispatch_replacesPriorListAndInsertsInOrder() {
        UUID case1 = UUID.randomUUID();
        UUID case2 = UUID.randomUUID();
        CreateDailyDispatchRequest request = new CreateDailyDispatchRequest();
        request.setAgentId(agentId);
        request.setDate(date);
        request.setCaseIds(List.of(case1, case2));

        when(allocationRepo.findAllById(List.of(case1, case2)))
                .thenReturn(List.of(allocationInOrg(case1, agentId), allocationInOrg(case2, agentId)));

        List<AllocationResponse> result = service.createDispatch(orgId, actorId, request);

        verify(dispatchRepo).deleteByOrgAndAgentAndDate(orgId, agentId, date);
        ArgumentCaptor<DailyVisitList> captor = ArgumentCaptor.forClass(DailyVisitList.class);
        verify(dispatchRepo, times(2)).save(captor.capture());
        assertThat(captor.getAllValues().get(0).getSequenceOrder()).isZero();
        assertThat(captor.getAllValues().get(1).getSequenceOrder()).isEqualTo(1);
        assertThat(result).hasSize(2);
    }

    @Test
    void createDispatch_emptyCaseIds_clearsListWithoutInserting() {
        CreateDailyDispatchRequest request = new CreateDailyDispatchRequest();
        request.setAgentId(agentId);
        request.setDate(date);
        request.setCaseIds(List.of());

        List<AllocationResponse> result = service.createDispatch(orgId, actorId, request);

        verify(dispatchRepo).deleteByOrgAndAgentAndDate(orgId, agentId, date);
        verify(dispatchRepo, never()).save(any());
        assertThat(result).isEmpty();
    }

    @Test
    void createDispatch_caseNotAssignedToTargetAgent_throwsBusinessException() {
        UUID caseId = UUID.randomUUID();
        CreateDailyDispatchRequest request = new CreateDailyDispatchRequest();
        request.setAgentId(agentId);
        request.setDate(date);
        request.setCaseIds(List.of(caseId));

        when(allocationRepo.findAllById(List.of(caseId)))
                .thenReturn(List.of(allocationInOrg(caseId, UUID.randomUUID())));

        assertThatThrownBy(() -> service.createDispatch(orgId, actorId, request))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void createDispatch_caseFromDifferentOrg_throwsResourceNotFound() {
        UUID caseId = UUID.randomUUID();
        CreateDailyDispatchRequest request = new CreateDailyDispatchRequest();
        request.setAgentId(agentId);
        request.setDate(date);
        request.setCaseIds(List.of(caseId));

        Organization otherOrg = new Organization();
        otherOrg.setId(UUID.randomUUID());
        Allocation foreignCase = Allocation.builder().id(caseId).organization(otherOrg).assignedToUserId(agentId).build();
        when(allocationRepo.findAllById(List.of(caseId))).thenReturn(List.of(foreignCase));

        assertThatThrownBy(() -> service.createDispatch(orgId, actorId, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createDispatch_agentFromDifferentOrg_throwsResourceNotFound() {
        UUID foreignAgentId = UUID.randomUUID();
        when(userRepository.findById(foreignAgentId))
                .thenReturn(Optional.of(User.builder().id(foreignAgentId).organizationId(UUID.randomUUID()).build()));
        CreateDailyDispatchRequest request = new CreateDailyDispatchRequest();
        request.setAgentId(foreignAgentId);
        request.setDate(date);
        request.setCaseIds(List.of());

        assertThatThrownBy(() -> service.createDispatch(orgId, actorId, request))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(dispatchRepo, never()).deleteByOrgAndAgentAndDate(any(), any(), any());
    }

    @Test
    void getListForAgent_agentFromDifferentOrg_throwsResourceNotFound() {
        UUID foreignAgentId = UUID.randomUUID();
        when(userRepository.findById(foreignAgentId))
                .thenReturn(Optional.of(User.builder().id(foreignAgentId).organizationId(UUID.randomUUID()).build()));

        assertThatThrownBy(() -> service.getListForAgent(orgId, foreignAgentId, date))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(dispatchRepo, never())
                .findByOrganizationIdAndAgentUserIdAndDispatchDateOrderBySequenceOrderAsc(any(), any(), any());
    }

    @Test
    void getListForAgent_filtersToOrgAndOrdersBySequence() {
        UUID case1 = UUID.randomUUID();
        DailyVisitList row = DailyVisitList.builder()
                .organizationId(orgId).agentUserId(agentId).dispatchDate(date)
                .allocationId(case1).sequenceOrder(0).build();
        when(dispatchRepo.findByOrganizationIdAndAgentUserIdAndDispatchDateOrderBySequenceOrderAsc(
                orgId, agentId, date)).thenReturn(List.of(row));
        when(allocationRepo.findAllById(any())).thenReturn(List.of(allocationInOrg(case1, agentId)));

        List<AllocationResponse> result = service.getListForAgent(orgId, agentId, date);

        assertThat(result).hasSize(1);
    }

    @Test
    void removeCase_delegatesToRepository() {
        UUID allocationId = UUID.randomUUID();
        service.removeCase(orgId, agentId, date, allocationId);
        verify(dispatchRepo).deleteByOrgAndAgentAndDateAndAllocation(orgId, agentId, date, allocationId);
    }

    @Test
    void countDispatchedForOrg_delegatesToRepository() {
        when(dispatchRepo.countByOrganizationIdAndDispatchDate(orgId, date)).thenReturn(5L);
        assertThat(service.countDispatchedForOrg(orgId, date)).isEqualTo(5L);
    }
}
