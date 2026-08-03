package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.DateAssignmentSummary;
import com.recoverpro.server.entity.Assignment;
import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.Priority;
import com.recoverpro.server.mapper.AssignmentMapper;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.repository.VisitLogRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.AuditLogService;
import com.recoverpro.server.service.CalendarService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssignmentServiceImplTest {

    @Mock private AssignmentRepository assignmentRepository;
    @Mock private CalendarService calendarService;
    @Mock private AuditLogService auditLogService;
    @Mock private AssignmentMapper assignmentMapper;
    @Mock private AllocationRepository allocationRepository;
    @Mock private UserRepository userRepository;
    @Mock private VisitLogRepository visitLogRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private AssignmentServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AssignmentServiceImpl(assignmentRepository, calendarService, auditLogService,
                assignmentMapper, allocationRepository, userRepository, visitLogRepository, orgIsolationGuard);
    }

    @Test
    void getDateSummary_groupsInMemory_noPerAgentQueries() {
        LocalDate date = LocalDate.of(2026, 7, 6);
        UUID orgId = UUID.randomUUID();
        UUID agentA = UUID.randomUUID();
        UUID agentB = UUID.randomUUID();

        Assignment a1 = Assignment.builder().agentId(agentA).priority(Priority.HIGH)
                .status(AssignmentStatus.PENDING).build();
        Assignment a2 = Assignment.builder().agentId(agentA).priority(Priority.LOW)
                .status(AssignmentStatus.PENDING).build();
        Assignment a3 = Assignment.builder().agentId(agentB).priority(Priority.HIGH)
                .status(AssignmentStatus.COMPLETED).build();

        Page<Assignment> page = new PageImpl<>(List.of(a1, a2, a3));
        when(assignmentRepository.findWithFilters(orgId, null, date, null, null, Pageable.unpaged()))
                .thenReturn(page);
        when(calendarService.getMaxCasesPerAgentPerDay(orgId)).thenReturn(20);

        DateAssignmentSummary summary = service.getDateSummary(date, orgId);

        assertThat(summary.getTotalAssignments()).isEqualTo(3);
        assertThat(summary.getTotalAgentsInvolved()).isEqualTo(2);
        assertThat(summary.getAgentBreakdown()).hasSize(2);
        assertThat(summary.getAgentBreakdown().stream()
                .filter(s -> s.getAgentId().equals(agentA)).findFirst().orElseThrow()
                .getTotalAssigned()).isEqualTo(2);

        verify(assignmentRepository, never()).findByAgentIdAndDateOrdered(any(), any());
        verify(calendarService, times(1)).getMaxCasesPerAgentPerDay(orgId);
    }
}
