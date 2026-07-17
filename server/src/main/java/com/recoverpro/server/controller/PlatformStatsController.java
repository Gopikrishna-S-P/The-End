package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.dto.response.PlatformStatsResponse;
import com.recoverpro.server.entity.UserCreationRequest.RequestStatus;
import com.recoverpro.server.entity.UserCreationRequest.RequestedRole;
import com.recoverpro.server.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@RestController
@RequestMapping("/api/v1/platform/stats")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformStatsController {

    private final OrganizationRepository orgRepo;
    private final UserRepository userRepo;
    private final AllocationRepository allocationRepo;
    private final FileUploadRepository fileUploadRepo;
    private final UserCreationRequestRepository userRequestRepo;

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<PlatformStatsResponse>> getStats() {
        Instant now = Instant.now();
        ZonedDateTime istNow = now.atZone(IST);
        Instant startOfMonth = istNow.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0).toInstant();
        Instant sevenDaysAgo = now.minusSeconds(7L * 24 * 3600);

        long totalOrgs  = orgRepo.countTenantOrgs();
        long activeOrgs = orgRepo.countActiveTenantOrgs();
        long inactiveOrgs = totalOrgs - activeOrgs;

        var tenantOrgs = orgRepo.findTenantOrgs();

        long newOrgsThisMonth = tenantOrgs.stream()
                .filter(o -> o.getCreatedAt() != null && o.getCreatedAt().isAfter(startOfMonth))
                .count();

        long totalUsers = userRepo.count() - userRepo.countByRoleName(PlatformConstants.ROLE_PLATFORM_ADMIN);

        long staleOrgs = tenantOrgs.stream()
                .filter(o -> userRepo.countByOrganizationId(o.getId()) == 0)
                .count();

        PlatformStatsResponse.RoleBreakdown roleBreakdown = PlatformStatsResponse.RoleBreakdown.builder()
                .orgAdmin(userRepo.countByRoleName(PlatformConstants.ROLE_ORG_ADMIN))
                .manager(userRepo.countByRoleName(PlatformConstants.ROLE_MANAGER))
                .tl(userRepo.countByRoleName(PlatformConstants.ROLE_TL))
                .fo(userRepo.countByRoleName(PlatformConstants.ROLE_FO))
                .caller(userRepo.countByRoleName(PlatformConstants.ROLE_CALLER))
                .tracer(userRepo.countByRoleName(PlatformConstants.ROLE_TRACER))
                .build();

        long totalAllocations    = allocationRepo.countByIsDeletedFalse();
        long totalUploads        = fileUploadRepo.countActive();
        long totalRowsProcessed  = fileUploadRepo.sumSuccessfulRows();
        long uploadsLast7Days    = fileUploadRepo.countSince(sevenDaysAgo);

        long pendingUserRequests = userRequestRepo.countByRequestedRoleAndStatus(RequestedRole.ORG_USER, RequestStatus.PENDING)
                + userRequestRepo.countByRequestedRoleAndStatus(RequestedRole.ORG_ADMIN, RequestStatus.PENDING);

        PlatformStatsResponse stats = PlatformStatsResponse.builder()
                .totalOrgs(totalOrgs).activeOrgs(activeOrgs).inactiveOrgs(inactiveOrgs)
                .newOrgsThisMonth(newOrgsThisMonth).totalUsers(totalUsers)
                .roleBreakdown(roleBreakdown)
                .totalAllocations(totalAllocations).totalUploads(totalUploads)
                .totalRowsProcessed(totalRowsProcessed).uploadsLast7Days(uploadsLast7Days)
                .pendingUserRequests(pendingUserRequests).staleOrgs(staleOrgs)
                .build();

        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
