package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.config.StripeConfig;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.ProcessedStripeEvent;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.ProcessedStripeEventRepository;
import com.stripe.model.Invoice;
import com.stripe.model.Price;
import com.stripe.model.Subscription;
import com.stripe.model.SubscriptionItem;
import com.stripe.model.SubscriptionItemCollection;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StripeWebhookServiceTest {

    @Mock
    private ProcessedStripeEventRepository processedEventRepository;
    @Mock
    private OrgSubscriptionRepository subscriptionRepository;
    @Mock
    private FeatureFlagService featureFlagService;

    private StripeConfig stripeConfig;
    private StripeWebhookService webhookService;

    @BeforeEach
    void setUp() {
        stripeConfig = new StripeConfig();
        setField(stripeConfig, "priceStarter", "price_starter_123");
        setField(stripeConfig, "priceGrowth", "price_growth_123");
        setField(stripeConfig, "priceEnterprise", "price_enterprise_123");

        webhookService = new StripeWebhookService(
                processedEventRepository, subscriptionRepository, featureFlagService, stripeConfig);
    }

    @Test
    void claimEvent_returnsTrueOnFirstDelivery() {
        boolean claimed = webhookService.claimEvent("evt_1", "invoice.paid");

        assertThat(claimed).isTrue();
        verify(processedEventRepository).saveAndFlush(any(ProcessedStripeEvent.class));
    }

    @Test
    void claimEvent_returnsFalseOnDuplicateDelivery() {
        when(processedEventRepository.saveAndFlush(any(ProcessedStripeEvent.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        boolean claimed = webhookService.claimEvent("evt_1", "invoice.paid");

        assertThat(claimed).isFalse();
    }

    @Test
    void handleCheckoutCompleted_activatesSubscriptionAndStoresSubscriptionId() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .stripeCustomerId("cus_1")
                .status(OrgSubscription.Status.TRIAL)
                .build();
        when(subscriptionRepository.findByStripeCustomerId("cus_1")).thenReturn(Optional.of(sub));

        Session session = new Session();
        session.setCustomer("cus_1");
        session.setSubscription("sub_1");

        webhookService.handleCheckoutCompleted(session);

        assertThat(sub.getStatus()).isEqualTo(OrgSubscription.Status.ACTIVE);
        assertThat(sub.getStripeSubscriptionId()).isEqualTo("sub_1");
        verify(subscriptionRepository).save(sub);
    }

    @Test
    void handleCheckoutCompleted_throwsWhenNoMatchingSubscription() {
        when(subscriptionRepository.findByStripeCustomerId("cus_unknown")).thenReturn(Optional.empty());

        Session session = new Session();
        session.setCustomer("cus_unknown");

        assertThatThrownBy(() -> webhookService.handleCheckoutCompleted(session))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cus_unknown");
    }

    @Test
    void handleSubscriptionUpserted_syncsStatusPlanPeriodEndAndProvisionsFlags() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .stripeCustomerId("cus_2")
                .status(OrgSubscription.Status.TRIAL)
                .plan(OrgSubscription.Plan.NONE)
                .build();
        when(subscriptionRepository.findByStripeCustomerId("cus_2")).thenReturn(Optional.of(sub));

        Subscription subscription = subscriptionFixture(
                "sub_2", "cus_2", "active", "price_growth_123", 1_800_000_000L, true);

        webhookService.handleSubscriptionUpserted(subscription);

        assertThat(sub.getStatus()).isEqualTo(OrgSubscription.Status.ACTIVE);
        assertThat(sub.getPlan()).isEqualTo(OrgSubscription.Plan.GROWTH);
        assertThat(sub.getStripeSubscriptionId()).isEqualTo("sub_2");
        assertThat(sub.getCurrentPeriodEnd()).isEqualTo(Instant.ofEpochSecond(1_800_000_000L));
        assertThat(sub.getCancelAtPeriodEnd()).isTrue();
        verify(featureFlagService).provisionFlagsForPlan(
                sub.getOrgId(), OrgSubscription.Status.ACTIVE, OrgSubscription.Plan.GROWTH);
    }

    @Test
    void handleSubscriptionDeleted_marksCancelledAndProvisionsFlags() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .stripeCustomerId("cus_3")
                .status(OrgSubscription.Status.ACTIVE)
                .plan(OrgSubscription.Plan.STARTER)
                .build();
        when(subscriptionRepository.findByStripeCustomerId("cus_3")).thenReturn(Optional.of(sub));

        Subscription subscription = subscriptionFixture(
                "sub_3", "cus_3", "canceled", "price_starter_123", null, false);

        webhookService.handleSubscriptionDeleted(subscription);

        assertThat(sub.getStatus()).isEqualTo(OrgSubscription.Status.CANCELLED);
        verify(featureFlagService).provisionFlagsForPlan(
                sub.getOrgId(), OrgSubscription.Status.CANCELLED, OrgSubscription.Plan.STARTER);
    }

    @Test
    void handleInvoicePaid_recoversFromPastDue() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .stripeCustomerId("cus_4")
                .status(OrgSubscription.Status.PAST_DUE)
                .plan(OrgSubscription.Plan.STARTER)
                .build();
        when(subscriptionRepository.findByStripeCustomerId("cus_4")).thenReturn(Optional.of(sub));

        Invoice invoice = new Invoice();
        invoice.setCustomer("cus_4");

        webhookService.handleInvoicePaid(invoice);

        assertThat(sub.getStatus()).isEqualTo(OrgSubscription.Status.ACTIVE);
        verify(subscriptionRepository).save(sub);
    }

    @Test
    void handleInvoicePaid_noOpWhenNotPastDue() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .stripeCustomerId("cus_5")
                .status(OrgSubscription.Status.ACTIVE)
                .plan(OrgSubscription.Plan.STARTER)
                .build();
        when(subscriptionRepository.findByStripeCustomerId("cus_5")).thenReturn(Optional.of(sub));

        Invoice invoice = new Invoice();
        invoice.setCustomer("cus_5");

        webhookService.handleInvoicePaid(invoice);

        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void handleInvoicePaymentFailed_marksPastDue() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .stripeCustomerId("cus_6")
                .status(OrgSubscription.Status.ACTIVE)
                .plan(OrgSubscription.Plan.GROWTH)
                .build();
        when(subscriptionRepository.findByStripeCustomerId("cus_6")).thenReturn(Optional.of(sub));

        Invoice invoice = new Invoice();
        invoice.setCustomer("cus_6");

        webhookService.handleInvoicePaymentFailed(invoice);

        assertThat(sub.getStatus()).isEqualTo(OrgSubscription.Status.PAST_DUE);
        verify(featureFlagService).provisionFlagsForPlan(
                sub.getOrgId(), OrgSubscription.Status.PAST_DUE, OrgSubscription.Plan.GROWTH);
    }

    @Test
    void handleSubscriptionUpserted_setsPlanAmountFromStripePriceUnitAmount() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .stripeCustomerId("cus_8")
                .plan(OrgSubscription.Plan.NONE)
                .build();
        when(subscriptionRepository.findByStripeCustomerId("cus_8")).thenReturn(Optional.of(sub));

        Subscription subscription = subscriptionFixture(
                "sub_8", "cus_8", "active", "price_growth_123", null, false, 799900L);

        webhookService.handleSubscriptionUpserted(subscription);

        assertThat(sub.getPlanAmount()).isEqualByComparingTo("7999.00");
    }

    @Test
    void handleSubscriptionUpserted_unrecognizedPriceDefaultsToStarter() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .stripeCustomerId("cus_7")
                .build();
        when(subscriptionRepository.findByStripeCustomerId("cus_7")).thenReturn(Optional.of(sub));

        Subscription subscription = subscriptionFixture(
                "sub_7", "cus_7", "active", "price_unknown_999", null, false);

        webhookService.handleSubscriptionUpserted(subscription);

        assertThat(sub.getPlan()).isEqualTo(OrgSubscription.Plan.STARTER);
    }

    private static Subscription subscriptionFixture(
            String id, String customerId, String status, String priceId,
            Long currentPeriodEnd, boolean cancelAtPeriodEnd) {
        return subscriptionFixture(id, customerId, status, priceId, currentPeriodEnd, cancelAtPeriodEnd, null);
    }

    private static Subscription subscriptionFixture(
            String id, String customerId, String status, String priceId,
            Long currentPeriodEnd, boolean cancelAtPeriodEnd, Long unitAmountCents) {

        Price price = new Price();
        price.setId(priceId);
        price.setUnitAmount(unitAmountCents);

        SubscriptionItem item = new SubscriptionItem();
        item.setPrice(price);

        SubscriptionItemCollection items = new SubscriptionItemCollection();
        items.setData(List.of(item));

        Subscription subscription = new Subscription();
        subscription.setId(id);
        subscription.setCustomer(customerId);
        subscription.setStatus(status);
        subscription.setItems(items);
        subscription.setCurrentPeriodEnd(currentPeriodEnd);
        subscription.setCancelAtPeriodEnd(cancelAtPeriodEnd);
        return subscription;
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
