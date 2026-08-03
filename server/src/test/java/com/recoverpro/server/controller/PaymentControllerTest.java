package com.recoverpro.server.controller;

import com.recoverpro.server.dto.response.PaymentIntentResponse;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.PaymentLinkService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: getIntent's "PLATFORM_ADMIN can see any" comment used to be dead code --
 * rls_payment_intents_isolation (V040) had no platform-admin bypass clause, so findById already
 * came back empty via RLS for a foreign-org intent before the controller's manual check could ever
 * matter. V060 added the bypass clause; this test proves the controller actually elevates via
 * PlatformAdminAccessGuard before fetching, which is what makes that bypass clause reachable at all.
 */
@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock private PaymentLinkService paymentLinkService;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    @Test
    void getIntent_platformAdmin_elevatesBeforeFetching() {
        PaymentController controller = new PaymentController(paymentLinkService, platformAdminAccessGuard);
        UUID intentId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(adminId);
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_PLATFORM_ADMIN"));
        doReturn(authorities).when(principal).getAuthorities();
        when(paymentLinkService.getIntent(intentId)).thenReturn(
                PaymentIntentResponse.builder().id(intentId).organizationId(UUID.randomUUID()).build());

        controller.getIntent(intentId, principal);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(adminId), anyString());
        verify(paymentLinkService).getIntent(intentId);
    }

    @Test
    void getIntent_nonPlatformAdmin_doesNotElevate() {
        PaymentController controller = new PaymentController(paymentLinkService, platformAdminAccessGuard);
        UUID intentId = UUID.randomUUID();

        UserPrincipal principal = mock(UserPrincipal.class);
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_FO"));
        doReturn(authorities).when(principal).getAuthorities();
        when(paymentLinkService.getIntent(intentId)).thenReturn(
                PaymentIntentResponse.builder().id(intentId).organizationId(UUID.randomUUID()).build());

        controller.getIntent(intentId, principal);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), anyString());
        verify(paymentLinkService).getIntent(intentId);
    }
}
