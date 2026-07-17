package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.UpdateSystemPromptRequest;
import com.recoverpro.server.entity.SystemPromptConfig;
import com.recoverpro.server.repository.SystemPromptConfigRepository;
import com.recoverpro.server.service.SystemPromptService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Exercises the real Spring caching proxy (not a Mockito mock of the service) so that the
 * {@code @Cacheable}/{@code @CacheEvict} annotations on resolveActiveTemplate/updatePrompt are
 * actually verified, not just assumed to work.
 */
class SystemPromptServiceImplTest {

    @Configuration
    @EnableCaching
    static class CachingTestConfig {
        @Bean
        SystemPromptConfigRepository systemPromptConfigRepository() {
            return mock(SystemPromptConfigRepository.class);
        }

        @Bean
        org.springframework.cache.CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("systemPrompts");
        }

        @Bean
        SystemPromptServiceImpl systemPromptServiceImpl(SystemPromptConfigRepository repo) {
            return new SystemPromptServiceImpl(repo);
        }
    }

    private AnnotationConfigApplicationContext ctx;
    private SystemPromptConfigRepository repo;
    private SystemPromptService service;

    @BeforeEach
    void setUp() {
        ctx = new AnnotationConfigApplicationContext(CachingTestConfig.class);
        repo = ctx.getBean(SystemPromptConfigRepository.class);
        service = ctx.getBean(SystemPromptService.class);
    }

    @AfterEach
    void tearDown() {
        ctx.close();
    }

    @Test
    void resolveActiveTemplate_secondCallForSameKey_skipsRepository() {
        SystemPromptConfig config = SystemPromptConfig.builder()
                .id(UUID.randomUUID()).promptKey("lucien").promptTemplate("v1").isActive(true).build();
        when(repo.findByPromptKeyAndIsActiveTrue("lucien")).thenReturn(Optional.of(config));

        assertThat(service.resolveActiveTemplate("lucien")).isEqualTo("v1");
        assertThat(service.resolveActiveTemplate("lucien")).isEqualTo("v1");

        verify(repo, times(1)).findByPromptKeyAndIsActiveTrue("lucien");
    }

    @Test
    void updatePrompt_evictsCache_soNextResolveSeesNewTemplate() {
        SystemPromptConfig original = SystemPromptConfig.builder()
                .id(UUID.randomUUID()).promptKey("lucien").promptTemplate("v1").version(1).isActive(true).build();
        SystemPromptConfig updated = SystemPromptConfig.builder()
                .id(original.getId()).promptKey("lucien").promptTemplate("v2").version(2).isActive(true).build();

        when(repo.findByPromptKeyAndIsActiveTrue("lucien")).thenReturn(Optional.of(original));
        when(repo.existsByPromptKey("lucien")).thenReturn(true);
        when(repo.save(eq(original))).thenReturn(updated);

        assertThat(service.resolveActiveTemplate("lucien")).isEqualTo("v1");

        UpdateSystemPromptRequest request = new UpdateSystemPromptRequest();
        request.setPromptTemplate("v2");
        service.updatePrompt("lucien", request, UUID.randomUUID());

        when(repo.findByPromptKeyAndIsActiveTrue("lucien")).thenReturn(Optional.of(updated));
        assertThat(service.resolveActiveTemplate("lucien")).isEqualTo("v2");
    }
}
