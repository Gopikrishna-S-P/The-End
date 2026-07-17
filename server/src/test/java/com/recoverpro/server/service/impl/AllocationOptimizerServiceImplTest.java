package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.OptimizeAssignmentOrderRequest;
import com.recoverpro.server.dto.response.OptimizedAssignmentOrderResponse;
import com.recoverpro.server.dto.response.OptimizedAssignmentOrderResponse.OrderedAllocation;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.BorrowerRiskScore;
import com.recoverpro.server.entity.RoutePlan;
import com.recoverpro.server.enums.BorrowerSegment;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.BorrowerRiskScoreRepository;
import com.recoverpro.server.repository.RoutePlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AllocationOptimizerServiceImplTest {

    @Mock private AllocationRepository allocationRepository;
    @Mock private BorrowerRiskScoreRepository riskScoreRepository;
    @Mock private RoutePlanRepository routePlanRepository;

    private AllocationOptimizerServiceImpl optimizer;

    private UUID orgId;
    private UUID agentId;

    @BeforeEach
    void setUp() {
        optimizer = new AllocationOptimizerServiceImpl(
                allocationRepository, riskScoreRepository, routePlanRepository);
        orgId = UUID.randomUUID();
        agentId = UUID.randomUUID();
    }

    private Allocation allocation(UUID id, UUID borrowerId, BigDecimal outstanding, boolean npaFlagged) {
        return Allocation.builder()
                .id(id)
                .isDeleted(false)
                .borrowerId(borrowerId)
                .outstandingAmount(outstanding)
                .npaFlagged(npaFlagged)
                .build();
    }

    private BorrowerRiskScore riskScore(BigDecimal propensity, BorrowerSegment segment) {
        return BorrowerRiskScore.builder()
                .defaultPropensity(propensity)
                .segment(segment)
                .build();
    }

    @Test
    void optimize_ordersHighestCompositeScoreFirst() {
        UUID borrowerLow = UUID.randomUUID();
        UUID borrowerHigh = UUID.randomUUID();

        Allocation lowRisk = allocation(UUID.randomUUID(), borrowerLow, new BigDecimal("1000"), false);
        Allocation highRiskNpa = allocation(UUID.randomUUID(), borrowerHigh, new BigDecimal("1000"), true);

        when(allocationRepository.findAllById(List.of(lowRisk.getId(), highRiskNpa.getId())))
                .thenReturn(List.of(lowRisk, highRiskNpa));
        when(riskScoreRepository.findFirstByBorrowerIdOrderByScoredAtDesc(borrowerLow))
                .thenReturn(Optional.of(riskScore(new BigDecimal("0.10"), BorrowerSegment.LIKELY_SELF_CURE)));
        when(riskScoreRepository.findFirstByBorrowerIdOrderByScoredAtDesc(borrowerHigh))
                .thenReturn(Optional.of(riskScore(new BigDecimal("0.90"), BorrowerSegment.WILFUL_DEFAULT)));
        when(routePlanRepository.findByAgentIdAndPlanDate(any(), any())).thenReturn(Optional.empty());

        OptimizeAssignmentOrderRequest request = new OptimizeAssignmentOrderRequest();
        request.setOrganizationId(orgId);
        request.setAgentId(agentId);
        request.setAllocationIds(List.of(lowRisk.getId(), highRiskNpa.getId()));

        OptimizedAssignmentOrderResponse response = optimizer.optimize(request);

        assertThat(response.getModelVersion()).isEqualTo("rules-v1");
        assertThat(response.getOrdered()).hasSize(2);
        // highRiskNpa: 0.90*0.50 + 1.0*0.30 + 1*0.20 = 0.9500
        // lowRisk:     0.10*0.50 + 1.0*0.30 + 0*0.20 = 0.3500
        assertThat(response.getOrdered().get(0).getAllocationId()).isEqualTo(highRiskNpa.getId());
        assertThat(response.getOrdered().get(0).getScore()).isEqualByComparingTo("0.9500");
        assertThat(response.getOrdered().get(0).getSequenceOrder()).isEqualTo(1);
        assertThat(response.getOrdered().get(0).getSegment()).isEqualTo("WILFUL_DEFAULT");
        assertThat(response.getOrdered().get(1).getAllocationId()).isEqualTo(lowRisk.getId());
        assertThat(response.getOrdered().get(1).getScore()).isEqualByComparingTo("0.3500");
        assertThat(response.getOrdered().get(1).getSequenceOrder()).isEqualTo(2);
    }

    @Test
    void optimize_allocationWithNoRiskScore_scoresPropensityAsZero() {
        Allocation noScore = allocation(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("500"), false);

        when(allocationRepository.findAllById(List.of(noScore.getId()))).thenReturn(List.of(noScore));
        when(riskScoreRepository.findFirstByBorrowerIdOrderByScoredAtDesc(noScore.getBorrowerId()))
                .thenReturn(Optional.empty());
        when(routePlanRepository.findByAgentIdAndPlanDate(any(), any())).thenReturn(Optional.empty());

        OptimizeAssignmentOrderRequest request = new OptimizeAssignmentOrderRequest();
        request.setOrganizationId(orgId);
        request.setAgentId(agentId);
        request.setAllocationIds(List.of(noScore.getId()));

        OptimizedAssignmentOrderResponse response = optimizer.optimize(request);

        // sole allocation -> outstandingRank = 1.0 (v / maxOutstanding), propensity=0, npa=0
        // score = 0*0.50 + 1.0*0.30 + 0*0.20 = 0.3000
        assertThat(response.getOrdered().get(0).getScore()).isEqualByComparingTo("0.3000");
        assertThat(response.getOrdered().get(0).getSegment()).isNull();
        assertThat(response.getOrdered().get(0).getRationale()).contains("no risk score on file");
    }

    @Test
    void optimize_excludesSoftDeletedAllocations() {
        Allocation deleted = Allocation.builder()
                .id(UUID.randomUUID())
                .isDeleted(true)
                .outstandingAmount(BigDecimal.TEN)
                .npaFlagged(false)
                .build();

        when(allocationRepository.findAllById(List.of(deleted.getId()))).thenReturn(List.of(deleted));

        OptimizeAssignmentOrderRequest request = new OptimizeAssignmentOrderRequest();
        request.setOrganizationId(orgId);
        request.setAgentId(agentId);
        request.setAllocationIds(List.of(deleted.getId()));

        OptimizedAssignmentOrderResponse response = optimizer.optimize(request);

        assertThat(response.getOrdered()).isEmpty();
        verifyNoInteractions(routePlanRepository);
    }

    @Test
    void optimize_emptyResult_neverTouchesRiskScoreOrRoutePlanRepos() {
        Allocation deleted = Allocation.builder()
                .id(UUID.randomUUID())
                .isDeleted(true)
                .build();
        when(allocationRepository.findAllById(any())).thenReturn(List.of(deleted));

        OptimizeAssignmentOrderRequest request = new OptimizeAssignmentOrderRequest();
        request.setOrganizationId(orgId);
        request.setAgentId(agentId);
        request.setAllocationIds(List.of(deleted.getId()));

        optimizer.optimize(request);

        verifyNoInteractions(riskScoreRepository);
        verifyNoInteractions(routePlanRepository);
    }

    @Test
    void upsertRoutePlan_createsNewPlanWithAverageScoreAndOrderedIds() {
        when(routePlanRepository.findByAgentIdAndPlanDate(agentId, LocalDate.now()))
                .thenReturn(Optional.empty());
        when(routePlanRepository.save(any(RoutePlan.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID a1 = UUID.randomUUID();
        UUID a2 = UUID.randomUUID();
        List<OrderedAllocation> ordered = List.of(
                OrderedAllocation.builder().allocationId(a1).sequenceOrder(1).score(new BigDecimal("0.80")).build(),
                OrderedAllocation.builder().allocationId(a2).sequenceOrder(2).score(new BigDecimal("0.40")).build());

        optimizer.upsertRoutePlan(agentId, orgId, ordered);

        ArgumentCaptor<RoutePlan> captor = ArgumentCaptor.forClass(RoutePlan.class);
        verify(routePlanRepository).save(captor.capture());
        RoutePlan saved = captor.getValue();

        assertThat(saved.getAgentId()).isEqualTo(agentId);
        assertThat(saved.getOrganizationId()).isEqualTo(orgId);
        assertThat(saved.getPlanDate()).isEqualTo(LocalDate.now());
        assertThat(saved.getAssignmentIds()).containsExactly(a1, a2);
        assertThat(saved.getScore()).isEqualByComparingTo("0.6000");
    }

    @Test
    void upsertRoutePlan_updatesExistingPlanForSameAgentAndDay() {
        RoutePlan existing = RoutePlan.builder()
                .id(UUID.randomUUID())
                .agentId(agentId)
                .organizationId(orgId)
                .planDate(LocalDate.now())
                .build();
        when(routePlanRepository.findByAgentIdAndPlanDate(agentId, LocalDate.now()))
                .thenReturn(Optional.of(existing));
        when(routePlanRepository.save(any(RoutePlan.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID a1 = UUID.randomUUID();
        List<OrderedAllocation> ordered = List.of(
                OrderedAllocation.builder().allocationId(a1).sequenceOrder(1).score(new BigDecimal("0.50")).build());

        optimizer.upsertRoutePlan(agentId, orgId, ordered);

        ArgumentCaptor<RoutePlan> captor = ArgumentCaptor.forClass(RoutePlan.class);
        verify(routePlanRepository).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(existing.getId());
        assertThat(captor.getValue().getAssignmentIds()).containsExactly(a1);
    }
}
