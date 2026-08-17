package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Dedup record for Razorpay webhook events, same role as {@link ProcessedStripeEvent} plays for
 * Stripe. Razorpay retries webhooks on non-2xx or timeout; this table ensures each event_id is
 * processed exactly once regardless of retry count.
 */
@Entity
@Table(name = "processed_razorpay_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessedRazorpayEvent {

    @Id
    @Column(name = "event_id", length = 64, nullable = false)
    private String eventId;

    @Column(name = "event_type", length = 100, nullable = false)
    private String eventType;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;
}
