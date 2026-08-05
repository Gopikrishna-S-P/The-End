package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.AgentContextDto;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.repository.PtpRepository;
import com.recoverpro.server.service.AgentContextService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Exercises the real Spring caching proxy so the {@code @Cacheable} on
 * buildContext is actually verified: SYSTEM_DESIGN.md 6.5 requires Lucien's
 * per-agent context be "assembled once per session, cached in Redis" instead
 * of rebuilt on every chat turn.
 */
class AgentContextServiceImplCachingTest {

    @Configuration
    @EnableCaching
    static class CachingTestConfig {
        @Bean
        AssignmentRepository assignmentRepository() {
            return mock(AssignmentRepository.class);
        }

        @Bean
        CollectionRepository collectionRepository() {
            return mock(CollectionRepository.class);
        }

        @Bean
        PtpRepository ptpRepository() {
            return mock(PtpRepository.class);
        }

        @Bean
        AllocationRepository allocationRepository() {
            return mock(AllocationRepository.class);
        }

        @Bean
        org.springframework.cache.CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("lucienContext");
        }

        @Bean
        AgentContextServiceImpl agentContextServiceImpl(AssignmentRepository a, CollectionRepository c,
                                                          PtpRepository p, AllocationRepository al) {
            return new AgentContextServiceImpl(a, c, p, al);
        }
    }

    private AnnotationConfigApplicationContext ctx;
    private AssignmentRepository assignmentRepository;
    private AgentContextService service;

    @BeforeEach
    void setUp() {
        ctx = new AnnotationConfigApplicationContext(CachingTestConfig.class);
        assignmentRepository = ctx.getBean(AssignmentRepository.class);
        CollectionRepository collectionRepository = ctx.getBean(CollectionRepository.class);
        PtpRepository ptpRepository = ctx.getBean(PtpRepository.class);
        AllocationRepository allocationRepository = ctx.getBean(AllocationRepository.class);
        service = ctx.getBean(AgentContextService.class);

        lenient().when(assignmentRepository.findAllByAgentAndDate(any(), any())).thenReturn(List.of());
        lenient().when(ptpRepository.countByAgentIdAndStatus(any(), any())).thenReturn(0L);
        lenient().when(ptpRepository.countByAgentStatusAndDateRange(any(), any(), any(), any())).thenReturn(0L);
        lenient().when(collectionRepository.sumCollectionByAgentBetweenDates(any(), any(), any()))
                .thenReturn(BigDecimal.ZERO);
        lenient().when(collectionRepository.countCollectionsByAgentBetweenDates(any(), any(), any()))
                .thenReturn(0L);
        lenient().when(allocationRepository.sumOutstandingByAgentId(any())).thenReturn(BigDecimal.ZERO);
    }

    @AfterEach
    void tearDown() {
        ctx.close();
    }

    @Test
    void buildContext_secondCallForSameSession_skipsRepositories() {
        UUID agentId = UUID.randomUUID();

        AgentContextDto first = service.buildContext("session-1", agentId, "Ann");
        AgentContextDto second = service.buildContext("session-1", agentId, "Ann");

        assertThat(first).isSameAs(second);
        verify(assignmentRepository, times(1)).findAllByAgentAndDate(any(), any());
    }

    @Test
    void buildContext_differentSessions_rebuildsIndependently() {
        UUID agentId = UUID.randomUUID();

        service.buildContext("session-1", agentId, "Ann");
        service.buildContext("session-2", agentId, "Ann");

        verify(assignmentRepository, times(2)).findAllByAgentAndDate(any(), any());
    }
}
