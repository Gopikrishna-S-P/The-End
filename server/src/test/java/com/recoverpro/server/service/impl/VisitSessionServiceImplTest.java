package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.VisitSessionResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.VisitSession;
import com.recoverpro.server.enums.VisitSessionStatus;
import com.recoverpro.server.repository.AgentLocationPingRepository;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.repository.VisitSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VisitSessionServiceImplTest {

    @Mock private VisitSessionRepository sessionRepo;
    @Mock private AgentLocationPingRepository pingRepo;
    @Mock private UserRepository userRepo;
    @Mock private AllocationRepository allocationRepo;

    private VisitSessionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new VisitSessionServiceImpl(sessionRepo, pingRepo, userRepo, allocationRepo);
    }

    @Test
    void getToday_batchesAgentAndAllocationLookups_insteadOfPerSession() {
        UUID agentId = UUID.randomUUID();
        UUID alloc1 = UUID.randomUUID();
        UUID alloc2 = UUID.randomUUID();

        VisitSession s1 = VisitSession.builder().id(UUID.randomUUID()).agentId(agentId)
                .allocationId(alloc1).status(VisitSessionStatus.STARTED).startedAt(Instant.now()).build();
        VisitSession s2 = VisitSession.builder().id(UUID.randomUUID()).agentId(agentId)
                .allocationId(alloc2).status(VisitSessionStatus.CLOSED).startedAt(Instant.now()).build();

        when(sessionRepo.findByAgentIdAndStartedAtBetween(any(), any(), any())).thenReturn(List.of(s1, s2));
        when(userRepo.findAllById(any())).thenReturn(List.of(
                User.builder().id(agentId).firstName("Ann").lastName("Agent").build()));
        when(allocationRepo.findAllById(any())).thenReturn(List.of(
                Allocation.builder().id(alloc1).loanNumber("L1").build(),
                Allocation.builder().id(alloc2).loanNumber("L2").build()));

        List<VisitSessionResponse> result = service.getToday(agentId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getAgentName()).isEqualTo("Ann Agent");
        verify(userRepo, times(1)).findAllById(any());
        verify(allocationRepo, times(1)).findAllById(any());
        verify(userRepo, never()).findById(any());
        verify(allocationRepo, never()).findById(any());
    }
}
