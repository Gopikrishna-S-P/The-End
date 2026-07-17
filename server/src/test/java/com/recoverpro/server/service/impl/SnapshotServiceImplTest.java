package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.AgentPerformanceSnapshot;
import com.recoverpro.server.entity.Assignment;
import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.Priority;
import com.recoverpro.server.repository.AgentPerformanceSnapshotRepository;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.MonthlyLoanBookSnapshotRepository;
import com.recoverpro.server.repository.NpaRecordRepository;
import com.recoverpro.server.repository.OrganizationRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SnapshotServiceImplTest {

    @Mock private AgentPerformanceSnapshotRepository agentSnapshotRepository;
    @Mock private MonthlyLoanBookSnapshotRepository loanBookSnapshotRepository;
    @Mock private NpaRecordRepository npaRecordRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private CollectionRepository collectionRepository;
    @Mock private AllocationRepository allocationRepository;

    private SnapshotServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SnapshotServiceImpl(agentSnapshotRepository, loanBookSnapshotRepository,
                npaRecordRepository, organizationRepository, assignmentRepository, collectionRepository,
                allocationRepository);
    }

    @Test
    void captureAgentPerformanceSnapshot_computesRealOutstandingAndEfficiency_notHardcodedZero() {
        UUID orgId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 7, 6);

        when(assignmentRepository.countAssignmentsByAgentForDate(date, orgId))
                .thenReturn(List.<Object[]>of(new Object[]{agentId, 4L}));
        Assignment completed1 = Assignment.builder().agentId(agentId).status(AssignmentStatus.COMPLETED)
                .priority(Priority.HIGH).build();
        Assignment completed2 = Assignment.builder().agentId(agentId).status(AssignmentStatus.COMPLETED)
                .priority(Priority.LOW).build();
        Assignment pending = Assignment.builder().agentId(agentId).status(AssignmentStatus.PENDING)
                .priority(Priority.LOW).build();
        when(assignmentRepository.findByAgentIdAndDateOrdered(agentId, date))
                .thenReturn(List.of(completed1, completed2, pending));

        when(collectionRepository.sumCollectionByAgentAndDate(agentId, date))
                .thenReturn(new BigDecimal("5000"));
        when(collectionRepository.countCollectionsByAgentAndDate(agentId, date)).thenReturn(2L);
        when(allocationRepository.sumOutstandingByAgentId(agentId)).thenReturn(new BigDecimal("20000"));
        when(agentSnapshotRepository.findByAgentIdAndSnapshotDate(agentId, date)).thenReturn(Optional.empty());
        when(agentSnapshotRepository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(inv -> inv.getArgument(0));

        service.captureAgentPerformanceSnapshot(orgId, date);

        ArgumentCaptor<AgentPerformanceSnapshot> captor = ArgumentCaptor.forClass(AgentPerformanceSnapshot.class);
        verify(agentSnapshotRepository).save(captor.capture());
        AgentPerformanceSnapshot saved = captor.getValue();

        assertThat(saved.getTotalCollected()).isEqualTo(2);
        assertThat(saved.getAmountOutstanding()).isEqualByComparingTo("20000");
        assertThat(saved.getCollectionEfficiency()).isEqualByComparingTo("25.00");
    }
}
