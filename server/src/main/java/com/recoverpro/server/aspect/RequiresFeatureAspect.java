package com.recoverpro.server.aspect;

import com.recoverpro.server.annotation.RequiresFeature;
import com.recoverpro.server.config.PlanFeatureMatrix;
import com.recoverpro.server.exception.AccessDeniedException;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.FeatureFlagService;
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
 * <p>Missing flag row = allowed (see {@code isEnabled}'s {@code defaultIfMissing=true} below).
 * Every existing org today has either an explicit MANUAL grant or no row at all (confirmed via
 * direct DB read before wiring this), so turning enforcement on doesn't lock anyone out of
 * something they already use -- {@link com.recoverpro.server.service.FeatureFlagService
 * #provisionFlagsFor} is what tightens this to the real plan boundary as subscriptions sync.
 * Platform admins and requests with no resolvable org (should not normally happen for an
 * org-scoped endpoint) are never blocked here -- this is a tenant billing gate, not an authN/Z
 * control, so it has no opinion on non-tenant callers.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RequiresFeatureAspect {

    private final FeatureFlagService featureFlagService;

    @Before("@annotation(requiresFeature)")
    public void checkFeatureFlag(RequiresFeature requiresFeature) {
        Object principal = SecurityContextHolder.getContext().getAuthentication() != null
                ? SecurityContextHolder.getContext().getAuthentication().getPrincipal()
                : null;
        if (!(principal instanceof UserPrincipal userPrincipal)) return;

        UUID organizationId = userPrincipal.getOrganizationId();
        if (organizationId == null) return;

        String flagKey = requiresFeature.value();
        if (!featureFlagService.isEnabled(organizationId, flagKey, true)) {
            log.info("Feature '{}' not entitled for org {}", flagKey, organizationId);
            throw new AccessDeniedException(
                    "This feature requires the " + PlanFeatureMatrix.requiredPlanLabel(flagKey) + " plan.");
        }
    }
}
