package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.DashboardFilterRequest;
import com.recoverpro.server.dto.response.UnifiedDashboardResponse;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.AuthenticatedUser;
import com.recoverpro.server.service.UnifiedDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UnifiedDashboardServiceImpl implements UnifiedDashboardService {

    private final PlatformDashboardBuilder platformBuilder;
    private final OrgDashboardBuilder orgBuilder;
    private final UserRepository userRepo;

    private static final int DEFAULT_TREND_MONTHS = 6;

    @Override
    public UnifiedDashboardResponse getDashboard(AuthenticatedUser caller, DashboardFilterRequest filter) {
        int trendMonths = (filter != null && filter.getTrendMonths() > 0)
                ? filter.getTrendMonths() : DEFAULT_TREND_MONTHS;

        log.info("Dashboard | userId={} role={}", caller.getUserId(), caller.getRole());

        var response = UnifiedDashboardResponse.builder()
                .role(caller.getRole())
                .generatedAt(Instant.now());

        switch (caller.getRole()) {

            case PLATFORM_ADMIN -> response.platform(platformBuilder.buildPlatformSection(trendMonths));

            case ORG_ADMIN, MANAGER, TL -> {
                UUID orgId = requireOrgId(caller);
                if (orgId == null) return response.build();
                response.organizationId(orgId)
                        .orgOverview(orgBuilder.buildOrgOverview(orgId))
                        .orgToday(orgBuilder.buildOrgToday(orgId))
                        .allocations(orgBuilder.buildAllocations(orgId))
                        .collections(orgBuilder.buildCollections(orgId, trendMonths))
                        .ptpSummary(orgBuilder.buildPtpSummary(orgId))
                        .team(orgBuilder.buildTeam(orgId));
            }

            case FO -> {
                UUID orgId = requireOrgId(caller);
                if (orgId == null) return response.build();
                response.organizationId(orgId);
                User user = userRepo.findById(caller.getUserId()).orElse(null);
                if (user != null) {
                    if (hasPermission(user, "COLLECTION_VIEW"))
                        response.collections(orgBuilder.buildCollections(orgId, trendMonths));
                    if (hasPermission(user, "PTP_VIEW"))
                        response.ptpSummary(orgBuilder.buildPtpSummary(orgId));
                }
            }

            case CALLER -> {
                UUID orgId = requireOrgId(caller);
                if (orgId == null) return response.build();
                response.organizationId(orgId)
                        .callerToday(orgBuilder.buildCallerToday(caller.getUserId(), orgId));
            }

            default -> log.warn("Unhandled dashboard role: {}", caller.getRole());
        }

        return response.build();
    }

    private UUID requireOrgId(AuthenticatedUser caller) {
        UUID orgId = caller.getScopeId();
        if (orgId == null) log.warn("Dashboard: no orgId for userId={}", caller.getUserId());
        return orgId;
    }

    private boolean hasPermission(User user, String permissionName) {
        return user.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .anyMatch(p -> permissionName.equalsIgnoreCase(p.getName()))
            || user.getDirectPermissions().stream()
                .anyMatch(up -> permissionName.equalsIgnoreCase(up.getPermission().getName()));
    }
}
