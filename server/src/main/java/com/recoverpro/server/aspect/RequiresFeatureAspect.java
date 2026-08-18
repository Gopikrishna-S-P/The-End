package com.recoverpro.server.aspect;

import com.recoverpro.server.annotation.RequiresFeature;
import com.recoverpro.server.config.PlanFeatureMatrix;
import com.recoverpro.server.exception.AccessDeniedException;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.EntitlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Enforces {@link RequiresFeature}. Previously a decorative marker with no runtime effect --
 * confirmed live (empty DB, no @Aspect anywhere in the codebase, no spring-boot-starter-aop
 * dependency) that LUCIEN_AI/ADVANCED_REPORTS were never actually gated by plan despite being
 * annotated in LucienController/ReportingController and priced on the Growth tier.
 *
 * <p>SYSTEM-PLAN 20.1: delegates to {@link EntitlementService#hasFeature} rather than calling
 * {@code FeatureFlagService.isEnabled} directly (as this class originally did). Both used to reach
 * the same underlying flag row but with DIFFERENT missing-row defaults -- this aspect defaulted to
 * {@code true} (allow), {@code EntitlementServiceImpl.hasFeature()} defaults to {@code false}
 * (deny) -- so the same org/flag pair could get two different answers depending which entry point
 * was called, worst of all during the real window between a new org being created and its first
 * {@code provisionFlagsFor} call populating flag rows. Routing through {@link EntitlementService}
 * makes this the ONE place that decision is made, fail-closed, per the production standard ("fail
 * CLOSED" -- never default to allow on an unresolvable check).
 *
 * <p>Platform admins and requests with no resolvable org (should not normally happen for an
 * org-scoped endpoint) are never blocked here -- this is a tenant billing gate, not an authN/Z
 * control, so it has no opinion on non-tenant callers.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RequiresFeatureAspect {

    private final EntitlementService entitlementService;

    @Before("@annotation(requiresFeature)")
    public void checkFeatureFlag(RequiresFeature requiresFeature) {
        Object principal = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getPrincipal()
                : null;
        if (!(principal instanceof UserPrincipal userPrincipal)) return;

        UUID organizationId = userPrincipal.getOrganizationId();
        if (organizationId == null) return;

        String flagKey = requiresFeature.value();
        if (!entitlementService.hasFeature(organizationId, flagKey)) {
            log.info("Feature '{}' not entitled for org {}", flagKey, organizationId);
            throw new AccessDeniedException(
                    "This feature requires the " + PlanFeatureMatrix.requiredPlanLabel(flagKey) + " plan.");
        }
    }
}
