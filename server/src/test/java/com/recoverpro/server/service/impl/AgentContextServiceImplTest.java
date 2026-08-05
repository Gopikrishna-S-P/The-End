package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.AgentContextDto;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.PtpRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentContextServiceImplTest {

    @Mock private AssignmentRepository assignmentRepository;
    @Mock private CollectionRepository collectionRepository;
    @Mock private PtpRepository ptpRepository;
    @Mock private AllocationRepository allocationRepository;

    private AgentContextServiceImpl service;
    private UUID agentId;

    @BeforeEach
    void setUp() {
        service = new AgentContextServiceImpl(assignmentRepository, collectionRepository, ptpRepository, allocationRepository);
        agentId = UUID.randomUUID();
        lenient().when(assignmentRepository.findAllByAgentAndDate(any(), any())).thenReturn(List.of());
        lenient().when(ptpRepository.countByAgentIdAndStatus(any(), any())).thenReturn(0L);
        lenient().when(ptpRepository.countByAgentStatusAndDateRange(any(), any(), any(), any())).thenReturn(0L);
    }

    @Test
    void buildContext_computesRealEfficiencyFromCollectedOverOutstanding() {
        when(collectionRepository.sumCollectionByAgentBetweenDates(any(), any(), any()))
                .thenReturn(new BigDecimal("5000"));
        when(collectionRepository.countCollectionsByAgentBetweenDates(any(), any(), any())).thenReturn(3L);
        when(allocationRepository.sumOutstandingByAgentId(agentId)).thenReturn(new BigDecimal("20000"));

        AgentContextDto ctx = service.buildContext("session-1", agentId, "Agent");

        assertThat(ctx.getCollectionEfficiencyPercent()).isEqualByComparingTo("25.00");
    }

    @Test
    void buildContext_zeroOutstanding_returnsZeroEfficiencyNotHardcoded75Point5() {
        when(collectionRepository.sumCollectionByAgentBetweenDates(any(), any(), any()))
                .thenReturn(new BigDecimal("5000"));
        when(collectionRepository.countCollectionsByAgentBetweenDates(any(), any(), any())).thenReturn(3L);
        when(allocationRepository.sumOutstandingByAgentId(agentId)).thenReturn(BigDecimal.ZERO);

        AgentContextDto ctx = service.buildContext("session-1", agentId, "Agent");

        assertThat(ctx.getCollectionEfficiencyPercent()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}
