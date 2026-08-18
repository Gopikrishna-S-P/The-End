package com.recoverpro.server.service.impl;

import com.recoverpro.server.config.PlanFeatureMatrix;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.FeatureFlagService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * SYSTEM-PLAN 20.1: {@link EntitlementServiceImpl} is the designated single entitlement
 * authority -- {@link com.recoverpro.server.aspect.RequiresFeatureAspect} now calls only this,
 * never {@link FeatureFlagService} directly. The one behavior that actually matters here is the
 * {@code defaultIfMissing} literal passed to {@code isEnabled}: it must stay {@code false} (fail
 * closed on an unresolvable/missing flag row), per the production standard ("fail CLOSED --
 * never default to allow").
 */
@ExtendWith(MockitoExtension.class)
class EntitlementServiceImplTest {

    @Mock private FeatureFlagService featureFlagService;
    @Mock private UserRepository userRepository;
    @Mock private AllocationRepository allocationRepository;

    private EntitlementServiceImpl service;

    private void setUp() {
        service = new EntitlementServiceImpl(featureFlagService, userRepository, allocationRepository);
    }

    @Test
    void hasFeature_missingFlagRow_failsClosed() {
        setUp();
        UUID orgId = UUID.randomUUID();
        when(featureFlagService.isEnabled(orgId, "LUCIEN_AI", false)).thenReturn(false);

        boolean result = service.hasFeature(orgId, "LUCIEN_AI");

        assertThat(result).isFalse();
        verify(featureFlagService).isEnabled(orgId, "LUCIEN_AI", false);
    }

    @Test
    void hasFeature_enabledRow_returnsTrue() {
        setUp();
        UUID orgId = UUID.randomUUID();
        when(featureFlagService.isEnabled(orgId, "LUCIEN_AI", false)).thenReturn(true);

        assertThat(service.hasFeature(orgId, "LUCIEN_AI")).isTrue();
    }

    @Test
    void canCreateUser_noLimitRow_meansUnlimited() {
        setUp();
        UUID orgId = UUID.randomUUID();
        when(featureFlagService.getLimit(orgId, PlanFeatureMatrix.MAX_USERS)).thenReturn(Optional.empty());

        assertThat(service.canCreateUser(orgId)).isTrue();
    }

    @Test
    void canCreateUser_atLimit_denies() {
        setUp();
        UUID orgId = UUID.randomUUID();
        when(featureFlagService.getLimit(orgId, PlanFeatureMatrix.MAX_USERS)).thenReturn(Optional.of(5L));
        when(userRepository.countByOrganizationId(orgId)).thenReturn(5L);

        assertThat(service.canCreateUser(orgId)).isFalse();
    }

    @Test
    void canCreateUser_belowLimit_allows() {
        setUp();
        UUID orgId = UUID.randomUUID();
        when(featureFlagService.getLimit(orgId, PlanFeatureMatrix.MAX_USERS)).thenReturn(Optional.of(5L));
        when(userRepository.countByOrganizationId(orgId)).thenReturn(4L);

        assertThat(service.canCreateUser(orgId)).isTrue();
    }

    @Test
    void canCreateAllocations_wouldExceedLimit_denies() {
        setUp();
        UUID orgId = UUID.randomUUID();
        when(featureFlagService.getLimit(orgId, PlanFeatureMatrix.MAX_ACTIVE_LOANS)).thenReturn(Optional.of(100L));
        when(allocationRepository.countByOrgId(orgId)).thenReturn(95L);

        assertThat(service.canCreateAllocations(orgId, 10)).isFalse();
    }

    @Test
    void canCreateAllocations_withinLimit_allows() {
        setUp();
        UUID orgId = UUID.randomUUID();
        when(featureFlagService.getLimit(orgId, PlanFeatureMatrix.MAX_ACTIVE_LOANS)).thenReturn(Optional.of(100L));
        when(allocationRepository.countByOrgId(orgId)).thenReturn(95L);

        assertThat(service.canCreateAllocations(orgId, 5)).isTrue();
    }
}
