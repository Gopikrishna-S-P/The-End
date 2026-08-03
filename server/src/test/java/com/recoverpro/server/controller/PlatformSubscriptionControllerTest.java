package com.recoverpro.server.controller;

import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.PlatformInvoiceRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.FeatureFlagService;
import com.recoverpro.server.service.StripeService;
import com.recoverpro.server.service.StripeWebhookService;
import com.recoverpro.server.service.UserActionAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: grantComp/revokeComp/changePlan/backfillInvoices are the only
 * consequential platform-admin write actions in the codebase that had no UserActionAuditService
 * call at all -- everything else comparable (PlatformOrganizationController's org
 * create/update/delete/activate, PlatformAdminAccessGuard's whole design) writes a permanent,
 * queryable audit-log entry. These four only logged to the application log (ephemeral, not the
 * same compliance trail) despite granting free plan tiers or forcing entitlement changes.
 */
@ExtendWith(MockitoExtension.class)
class PlatformSubscriptionControllerTest {

    @Mock private OrgSubscriptionRepository subRepo;
    @Mock private OrganizationRepository orgRepo;
    @Mock private StripeService stripeService;
    @Mock private PlatformInvoiceRepository invoiceRepo;
    @Mock private StripeWebhookService stripeWebhookService;
    @Mock private FeatureFlagService featureFlagService;
    @Mock private UserActionAuditService auditLogService;

    private PlatformSubscriptionController controller;
    private UUID orgId;
    private UserPrincipal caller;

    @BeforeEach
    void setUp() {
        controller = new PlatformSubscriptionController(
                subRepo, orgRepo, stripeService, invoiceRepo, stripeWebhookService, featureFlagService, auditLogService);
        orgId = UUID.randomUUID();
        caller = mock(UserPrincipal.class);
        lenient().when(caller.getId()).thenReturn(UUID.randomUUID());
        lenient().when(orgRepo.findById(orgId)).thenReturn(
                Optional.of(Organization.builder().id(orgId).name("Test Org").build()));
        lenient().when(invoiceRepo.sumCollectedByOrg(orgId)).thenReturn(0L);
    }

    @Test
    void grantComp_writesAuditLogEntry() {
        when(subRepo.findByOrgId(orgId)).thenReturn(Optional.empty());
        when(subRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        controller.grantComp(orgId, java.util.Map.of("plan", "GROWTH", "reason", "pilot customer"), caller);

        verify(auditLogService).logUserAction(any(), eq("ORG_SUBSCRIPTION_COMPED"), contains("pilot customer"));
    }

    @Test
    void revokeComp_writesAuditLogEntry() {
        OrgSubscription sub = OrgSubscription.builder().orgId(orgId).build();
        sub.setCompedPlan(OrgSubscription.Plan.GROWTH);
        when(subRepo.findByOrgId(orgId)).thenReturn(Optional.of(sub));
        when(subRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        controller.revokeComp(orgId, caller);

        verify(auditLogService).logUserAction(any(), eq("ORG_SUBSCRIPTION_COMP_REVOKED"), anyString());
    }

    @Test
    void changePlan_writesAuditLogEntry() {
        OrgSubscription sub = OrgSubscription.builder().orgId(orgId).build();
        when(subRepo.findByOrgId(orgId)).thenReturn(Optional.of(sub));
        when(subRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        controller.changePlan(orgId, java.util.Map.of("plan", "STARTER"), caller);

        verify(auditLogService).logUserAction(any(), eq("ORG_SUBSCRIPTION_PLAN_FORCED"), anyString());
    }

    @Test
    void backfillInvoices_writesAuditLogEntry() {
        when(subRepo.findAll()).thenReturn(List.of());

        controller.backfillInvoices(caller);

        verify(auditLogService).logUserAction(any(), eq("PLATFORM_INVOICE_BACKFILL"), anyString());
    }
}
