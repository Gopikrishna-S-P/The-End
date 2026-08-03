package com.recoverpro.server.controller;

import com.recoverpro.server.dto.response.PlatformStatsResponse;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.UserCreationRequest.RequestStatus;
import com.recoverpro.server.entity.UserCreationRequest.RequestedRole;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.UserCreationRequestRepository;
import com.recoverpro.server.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: staleOrgs used to run one countByOrganizationId query per tenant org.
 * Switched to the same grouped-query pattern used to fix the identical N+1 in
 * PlatformAnalyticsService.
 */
@ExtendWith(MockitoExtension.class)
class PlatformStatsControllerTest {

    @Mock private OrganizationRepository orgRepo;
    @Mock private UserRepository userRepo;
    @Mock private AllocationRepository allocationRepo;
    @Mock private FileUploadRepository fileUploadRepo;
    @Mock private UserCreationRequestRepository userRequestRepo;

    private PlatformStatsController controller;

    @BeforeEach
    void setUp() {
        controller = new PlatformStatsController(orgRepo, userRepo, allocationRepo, fileUploadRepo, userRequestRepo);
        lenient().when(orgRepo.countTenantOrgs()).thenReturn(2L);
        lenient().when(orgRepo.countActiveTenantOrgs()).thenReturn(2L);
        lenient().when(userRepo.count()).thenReturn(5L);
        lenient().when(userRepo.countByRoleName(any())).thenReturn(0L);
        lenient().when(allocationRepo.countByIsDeletedFalse()).thenReturn(0L);
        lenient().when(fileUploadRepo.countActive()).thenReturn(0L);
        lenient().when(fileUploadRepo.sumSuccessfulRows()).thenReturn(0L);
        lenient().when(fileUploadRepo.countSince(any(Instant.class))).thenReturn(0L);
        lenient().when(userRequestRepo.countByRequestedRoleAndStatus(any(RequestedRole.class), any(RequestStatus.class)))
                .thenReturn(0L);
    }

    @Test
    void getStats_staleOrgs_countsOrgsWithZeroUsers_viaGroupedQuery() {
        UUID activeOrgId = UUID.randomUUID();
        UUID staleOrgId = UUID.randomUUID();
        Organization active = Organization.builder().id(activeOrgId).name("Active Org").build();
        Organization stale = Organization.builder().id(staleOrgId).name("Stale Org").build();
        when(orgRepo.findTenantOrgs()).thenReturn(List.of(active, stale));
        // Only activeOrgId appears -- staleOrgId has zero users and is absent from the grouped result.
        when(userRepo.countGroupedByOrganizationIdIn(List.of(activeOrgId, staleOrgId)))
                .thenReturn(List.<Object[]>of(new Object[]{activeOrgId, 3L}));

        ResponseEntity<com.recoverpro.server.common.dto.response.ApiResponse<PlatformStatsResponse>> response =
                controller.getStats();

        assertThat(response.getBody().getData().getStaleOrgs()).isEqualTo(1L);
    }
}
