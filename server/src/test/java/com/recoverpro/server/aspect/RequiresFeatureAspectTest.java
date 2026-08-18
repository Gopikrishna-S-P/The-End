package com.recoverpro.server.aspect;

import com.recoverpro.server.annotation.RequiresFeature;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.exception.AccessDeniedException;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.EntitlementService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * SYSTEM-PLAN 20.1: this aspect used to call {@code FeatureFlagService.isEnabled(org, key, true)}
 * directly -- fail-OPEN on a missing flag row -- while {@link EntitlementService#hasFeature} (the
 * designated single entitlement authority) defaulted the same lookup to fail-CLOSED. Asserts the
 * aspect now goes through {@link EntitlementService} exclusively, so there is exactly one answer
 * for "does this org have this feature", not two that can disagree.
 */
@ExtendWith(MockitoExtension.class)
class RequiresFeatureAspectTest {

    @Mock private EntitlementService entitlementService;

    private RequiresFeatureAspect aspect;

    private static final String FLAG_KEY = "LUCIEN_AI";

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private RequiresFeature annotationRequiring(String key) {
        return new RequiresFeature() {
            @Override public String value() { return key; }
            @Override public Class<? extends java.lang.annotation.Annotation> annotationType() { return RequiresFeature.class; }
        };
    }

    private void actAs(UUID organizationId) {
        User caller = User.builder().organizationId(organizationId).roles(Set.of()).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new UserPrincipal(caller), null, List.of()));
    }

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        aspect = new RequiresFeatureAspect(entitlementService);
    }

    @Test
    void checkFeatureFlag_entitled_doesNotThrow() {
        UUID orgId = UUID.randomUUID();
        actAs(orgId);
        when(entitlementService.hasFeature(orgId, FLAG_KEY)).thenReturn(true);

        assertThatCode(() -> aspect.checkFeatureFlag(annotationRequiring(FLAG_KEY)))
                .doesNotThrowAnyException();

        verify(entitlementService).hasFeature(orgId, FLAG_KEY);
    }

    @Test
    void checkFeatureFlag_notEntitled_throwsAccessDenied() {
        UUID orgId = UUID.randomUUID();
        actAs(orgId);
        when(entitlementService.hasFeature(orgId, FLAG_KEY)).thenReturn(false);

        assertThatThrownBy(() -> aspect.checkFeatureFlag(annotationRequiring(FLAG_KEY)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void checkFeatureFlag_missingFlagRow_delegatesFailClosedDecisionToEntitlementService() {
        // The aspect no longer has its own missing-row default -- it just relays whatever
        // EntitlementService decides. This proves there is no second, aspect-local default left
        // to disagree with EntitlementServiceImpl's fail-closed one.
        UUID orgId = UUID.randomUUID();
        actAs(orgId);
        when(entitlementService.hasFeature(eq(orgId), any())).thenReturn(false);

        assertThatThrownBy(() -> aspect.checkFeatureFlag(annotationRequiring(FLAG_KEY)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void checkFeatureFlag_noAuthentication_doesNotCheckOrThrow() {
        SecurityContextHolder.clearContext();

        assertThatCode(() -> aspect.checkFeatureFlag(annotationRequiring(FLAG_KEY)))
                .doesNotThrowAnyException();

        verify(entitlementService, org.mockito.Mockito.never()).hasFeature(any(), any());
    }

    @Test
    void checkFeatureFlag_noOrganization_doesNotCheckOrThrow() {
        actAs(null);

        assertThatCode(() -> aspect.checkFeatureFlag(annotationRequiring(FLAG_KEY)))
                .doesNotThrowAnyException();

        verify(entitlementService, org.mockito.Mockito.never()).hasFeature(any(), any());
    }
}
