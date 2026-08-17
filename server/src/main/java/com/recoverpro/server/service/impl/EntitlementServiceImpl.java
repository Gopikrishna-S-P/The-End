package com.recoverpro.server.service.impl;

import com.recoverpro.server.config.PlanFeatureMatrix;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.EntitlementService;
import com.recoverpro.server.service.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Usage is checked live (COUNT query vs. the configured limit), not tracked in a maintained
 * counter column. A separately-maintained counter drifts from reality the moment any write path
 * forgets to increment/decrement it (soft-deletes, bulk imports, admin edits) -- a live count is
 * correct by construction, at the cost of a count query per check. At RecoverPro's actual traffic
 * this is the right trade, not premature optimization territory (Billing Ledger design doc §6).
 */
@Service
@RequiredArgsConstructor
public class EntitlementServiceImpl implements EntitlementService {

    private final FeatureFlagService featureFlagService;
    private final UserRepository userRepository;
    private final AllocationRepository allocationRepository;

    @Override
    public boolean hasFeature(UUID organizationId, String flagKey) {
        return featureFlagService.isEnabled(organizationId, flagKey, false);
    }

    @Override
    public Optional<Long> getLimit(UUID organizationId, String limitKey) {
        return featureFlagService.getLimit(organizationId, limitKey);
    }

    @Override
    public boolean canCreateUser(UUID organizationId) {
        Optional<Long> limit = getLimit(organizationId, PlanFeatureMatrix.MAX_USERS);
        if (limit.isEmpty()) return true; // unlimited
        return userRepository.countByOrganizationId(organizationId) < limit.get();
    }

    @Override
    public boolean canCreateAllocations(UUID organizationId, long additionalCount) {
        Optional<Long> limit = getLimit(organizationId, PlanFeatureMatrix.MAX_ACTIVE_LOANS);
        if (limit.isEmpty()) return true; // unlimited
        return allocationRepository.countByOrgId(organizationId) + additionalCount <= limit.get();
    }
}
