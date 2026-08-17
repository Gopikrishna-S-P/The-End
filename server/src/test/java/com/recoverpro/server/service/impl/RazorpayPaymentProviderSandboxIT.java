package com.recoverpro.server.service.impl;

import com.razorpay.Plan;
import com.razorpay.RazorpayClient;
import com.recoverpro.server.config.RazorpayConfig;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import org.json.JSONObject;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.Mockito;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Exercises {@link RazorpayPaymentProvider} against Razorpay's REAL test-mode API -- not mocks --
 * to close the gap flagged in the Billing Ledger design doc: "Razorpay has never touched a real
 * account -- everything is unit-tested against mocks. No sandbox integration test has actually
 * run."
 * <p>
 * <b>Status as of authoring: written but never executed.</b> This environment has no Razorpay
 * test-mode credentials, so this class has not been run against a live account even once. Every
 * request/response field name used here (plan create payload, subscription create/cancel shapes)
 * follows Razorpay's public API docs and the SDK's own method signatures (verified by reading the
 * razorpay-java 1.4.4 sources jar directly), the same verify-before-production caveat carried by
 * {@link RazorpayPaymentProvider} and {@link RazorpayConfig} themselves -- but that is not a
 * substitute for an actual run. Run this once real credentials exist, before relying on Razorpay
 * in production.
 * <p>
 * <b>Gating, two layers deep:</b>
 * <ol>
 *   <li>Filename ends in {@code IT}, not {@code Test} -- excluded from Surefire's default
 *       {@code **&#47;*Test.java} pattern, so a plain {@code mvn test} never picks this up.</li>
 *   <li>{@link EnabledIfEnvironmentVariable} additionally skips it even under an explicit
 *       {@code -Dtest=} invocation unless both {@code RAZORPAY_SANDBOX_KEY_ID} and
 *       {@code RAZORPAY_SANDBOX_KEY_SECRET} are set to a real Razorpay TEST-mode key pair
 *       (test keys are prefixed {@code rzp_test_}; never point this at a live key pair, since it
 *       creates and cancels a real plan/customer/subscription).</li>
 * </ol>
 * <p>
 * <b>Scope, and why it stops here:</b> {@code createCheckoutUrl} and {@code cancelSubscription}
 * are covered directly -- both can be driven end-to-end by server-side API calls alone.
 * {@code changePlan} and {@code refundPayment} are NOT covered: both require an actual captured
 * payment on the subscription first, which in turn requires a human completing Razorpay's hosted
 * checkout UI with a test card -- not something a headless CI run can produce. Faking that here
 * (e.g. hand-writing a "captured" JSON blob) would test nothing real and was rejected rather than
 * included as false coverage. Covering those two properly needs either Razorpay's manual
 * test-card-capture flow run by a human once, or a recorded fixture from that run -- flagged as a
 * follow-up, not attempted here.
 * <p>
 * {@link OrgSubscriptionRepository} is mocked (as an in-memory stand-in, not a real database) so
 * this test needs no Postgres/Spring context -- only real HTTP calls to Razorpay itself, keeping
 * it fast and isolated to exactly the thing being verified: does {@link RazorpayPaymentProvider}
 * actually work against the real API.
 */
@EnabledIfEnvironmentVariable(named = "RAZORPAY_SANDBOX_KEY_ID", matches = ".+")
@EnabledIfEnvironmentVariable(named = "RAZORPAY_SANDBOX_KEY_SECRET", matches = ".+")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class RazorpayPaymentProviderSandboxIT {

    private static RazorpayClient client;
    private static String sandboxPlanId;
    private static UUID orgId;
    private static OrgSubscriptionRepository subRepo;
    private static RazorpayPaymentProvider provider;
    private static OrgSubscription sub;

    @BeforeAll
    static void createSandboxPlanAndProvider() throws Exception {
        String keyId = System.getenv("RAZORPAY_SANDBOX_KEY_ID");
        String keySecret = System.getenv("RAZORPAY_SANDBOX_KEY_SECRET");
        client = new RazorpayClient(keyId, keySecret);

        // A fresh throwaway plan per run -- Razorpay's Plans API has no delete endpoint, so
        // sandbox accounts will accumulate one "RecoverPro Sandbox IT" plan per run; harmless
        // clutter in a test-mode account, not cleaned up here for that reason.
        JSONObject planRequest = new JSONObject()
                .put("period", "monthly")
                .put("interval", 1)
                .put("item", new JSONObject()
                        .put("name", "RecoverPro Sandbox IT " + System.currentTimeMillis())
                        .put("amount", 100) // 100 paise = INR 1, the API's practical minimum
                        .put("currency", "INR")
                        .put("description", "Created by RazorpayPaymentProviderSandboxIT, safe to ignore/delete"));
        Plan plan = client.plans.create(planRequest);
        sandboxPlanId = plan.get("id");

        orgId = UUID.randomUUID();
        sub = OrgSubscription.builder().orgId(orgId).build();
        subRepo = Mockito.mock(OrgSubscriptionRepository.class);
        when(subRepo.findByOrgId(orgId)).thenAnswer(inv -> Optional.of(sub));
        when(subRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RazorpayConfig config = new RazorpayConfig();
        setField(config, "client", client);
        // GROWTH is the plan resolvePlanId() maps unrecognized/STARTER names to by default in the
        // real provider (RazorpayPaymentProvider#resolvePlanId); pointing planStarter at the
        // sandbox plan means calling createCheckoutUrl(orgId, "STARTER") below resolves to it.
        setField(config, "planStarter", sandboxPlanId);

        provider = new RazorpayPaymentProvider(config, subRepo);
    }

    @Test
    @Order(1)
    void createCheckoutUrl_realSandboxAccount_createsCustomerAndSubscriptionAndReturnsRealShortUrl() {
        String url = provider.createCheckoutUrl(orgId, "STARTER");

        assertThat(url).isNotBlank();
        // Razorpay's real short-URL redirect domain -- if this ever changes, that's itself
        // evidence the API surface moved and this whole class needs re-verifying.
        assertThat(url).contains("rzp.io");
        assertThat(sub.getRazorpayCustomerId()).isNotBlank();
        assertThat(sub.getRazorpaySubscriptionId()).isNotBlank();
    }

    @Test
    @Order(2)
    void cancelSubscription_realSandboxAccount_cancelsTheSubscriptionJustCreated() {
        // Depends on Order(1) having run first and populated sub.razorpaySubscriptionId --
        // JUnit's default per-class instance lifecycle plus @TestMethodOrder makes this safe
        // within a single class, same reasoning as any other ordered integration flow.
        assertThat(sub.getRazorpaySubscriptionId()).isNotBlank();

        provider.cancelSubscription(orgId, true);

        // No exception thrown is the assertion here -- cancelSubscription returns void, and a
        // failed cancel throws PaymentProviderException, which would fail this test.
    }

    @AfterAll
    static void tearDown() {
        client = null;
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(target, value);
    }
}
