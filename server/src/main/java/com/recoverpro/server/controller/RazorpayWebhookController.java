package com.recoverpro.server.controller;

import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import com.recoverpro.server.config.RazorpayConfig;
import com.recoverpro.server.service.RazorpayWebhookService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Public route -- Razorpay calls this directly, no JWT. Same shape as {@link StripeWebhookController}:
 * raw body read via {@link HttpServletRequest} (not {@code @RequestBody String}, for the same
 * content-type reason documented there), signature verified before anything else runs, event
 * claimed for idempotency, claim released on processing failure so Razorpay's own retry can
 * re-attempt.
 * <p>
 * {@code Utils.verifyWebhookSignature} returns {@code false} on a mismatch -- it does NOT throw
 * for a bad signature, only for an HMAC-computation error -- so the boolean result is checked
 * explicitly rather than relying on a caught exception (confirmed against the razorpay-java
 * 1.4.4 SDK source, not assumed).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/webhooks/razorpay")
@RequiredArgsConstructor
public class RazorpayWebhookController {

    private final RazorpayConfig razorpayConfig;
    private final RazorpayWebhookService razorpayWebhookService;

    @PostMapping
    public ResponseEntity<String> handle(
            HttpServletRequest request,
            @RequestHeader("X-Razorpay-Signature") String signature) throws IOException {

        String payload = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

        try {
            if (!Utils.verifyWebhookSignature(payload, signature, razorpayConfig.getWebhookSecret())) {
                log.warn("Razorpay webhook signature verification failed");
                return ResponseEntity.badRequest().body("Invalid signature");
            }
        } catch (RazorpayException e) {
            log.warn("Razorpay webhook signature check errored: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Invalid signature");
        }

        JSONObject envelope = new JSONObject(payload);
        String eventType = envelope.optString("event", null);
        // Razorpay webhook deliveries carry no top-level event id the way Stripe's Event.getId()
        // does -- idempotency is instead keyed on (event type + created_at + the resource id
        // inside payload), which is unique enough for a single delivery+retries of the same
        // occurrence without a dedicated id field. Verify this against a live payload capture:
        // if Razorpay does expose a stable per-delivery id under a different key, prefer that.
        String eventId = eventType + ":" + envelope.optLong("created_at", 0)
                + ":" + resourceIdFor(envelope);

        if (eventType == null || !razorpayWebhookService.claimEvent(eventId, eventType)) {
            return ResponseEntity.ok("Duplicate event or unrecognised payload, already processed");
        }

        try {
            dispatch(eventType, envelope);
        } catch (Exception e) {
            log.error("Error handling Razorpay event {} (type={}): {}", eventId, eventType, e.getMessage(), e);
            razorpayWebhookService.releaseEventClaim(eventId);
            return ResponseEntity.status(500).body("Processing failed, will retry");
        }
        return ResponseEntity.ok("Processed");
    }

    private void dispatch(String eventType, JSONObject envelope) {
        if (!eventType.startsWith("subscription.")) {
            log.debug("Unhandled Razorpay event type: {}", eventType);
            return;
        }
        JSONObject payload = envelope.optJSONObject("payload");
        JSONObject subscriptionWrapper = payload == null ? null : payload.optJSONObject("subscription");
        JSONObject subscriptionEntity = subscriptionWrapper == null ? null : subscriptionWrapper.optJSONObject("entity");
        if (subscriptionEntity == null) {
            log.warn("Razorpay event {} had no payload.subscription.entity, skipping", eventType);
            return;
        }
        razorpayWebhookService.handleSubscriptionEvent(eventType, subscriptionEntity);
    }

    private static String resourceIdFor(JSONObject envelope) {
        JSONObject payload = envelope.optJSONObject("payload");
        if (payload == null) return "";
        JSONObject subscriptionWrapper = payload.optJSONObject("subscription");
        if (subscriptionWrapper != null) {
            JSONObject entity = subscriptionWrapper.optJSONObject("entity");
            if (entity != null) return entity.optString("id", "");
        }
        JSONObject paymentWrapper = payload.optJSONObject("payment");
        if (paymentWrapper != null) {
            JSONObject entity = paymentWrapper.optJSONObject("entity");
            if (entity != null) return entity.optString("id", "");
        }
        return "";
    }
}
