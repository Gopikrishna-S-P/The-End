package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.FeatureFlagService;
import com.recoverpro.server.service.StripeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: selectFree/checkout/portal all assumed a real org context
 * (caller.getOrganizationId() != null), which fails silently badly for a platform admin (whose org
 * is always null) -- selectFree threw a raw DataIntegrityViolationException (org_subscriptions.org_id
 * is NOT NULL), checkout threw an unhandled NullPointerException (StripeService.ensureCustomer calls
 * orgId.toString() unconditionally), and portal threw a caught-but-ugly IllegalStateException. All
 * three now fail fast with a clean, readable BusinessException instead.
 */
@ExtendWith(MockitoExtension.class)
class SubscriptionControllerTest {

    @Mock private OrgSubscriptionRepository subRepo;
    @Mock private StripeService stripeService;
    @Mock private FeatureFlagService featureFlagService;

    private SubscriptionController newController() {
        return new SubscriptionController(subRepo, stripeService, featureFlagService);
    }

    private UserPrincipal principalWithOrg(UUID orgId) {
        UserPrincipal p = mock(UserPrincipal.class);
        when(p.getOrganizationId()).thenReturn(orgId);
        return p;
    }

    @Test
    void selectFree_platformAdmin_throwsCleanBusinessException() {
        SubscriptionController controller = newController();
        UserPrincipal admin = principalWithOrg(null);

        assertThrows(BusinessException.class, () -> controller.selectFree(admin));

        verify(subRepo, never()).save(any());
    }

    @Test
    void selectFree_orgAdmin_succeeds() {
        SubscriptionController controller = newController();
        UUID orgId = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithOrg(orgId);
        when(subRepo.findByOrgId(orgId)).thenReturn(Optional.empty());
        when(subRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        controller.selectFree(orgAdmin);

        verify(subRepo).save(any(OrgSubscription.class));
    }

    @Test
    void checkout_platformAdmin_throwsCleanBusinessException() {
        SubscriptionController controller = newController();
        UserPrincipal admin = principalWithOrg(null);

        assertThrows(BusinessException.class, () -> controller.checkout(Map.of("plan", "GROWTH"), admin));
    }

    @Test
    void portal_platformAdmin_throwsCleanBusinessException() {
        SubscriptionController controller = newController();
        UserPrincipal admin = principalWithOrg(null);

        assertThrows(BusinessException.class, () -> controller.portal(admin));
    }
}
