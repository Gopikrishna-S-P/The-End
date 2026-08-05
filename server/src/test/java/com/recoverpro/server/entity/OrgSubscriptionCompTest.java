package com.recoverpro.server.entity;

import com.recoverpro.server.entity.OrgSubscription.Plan;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Comp resolution rules.
 *
 * <p>A comp is an admin grant of plan access the org has not paid for. It has to
 * win over the Stripe-derived plan while it is live, and stop winning the moment
 * it expires -- without anything having to sweep the row, since a grant that
 * only lapsed when some cleanup job happened to run would silently hand out paid
 * features for as long as that job was broken.
 */
class OrgSubscriptionCompTest {

    @Test
    void activeComp_isNullWhenNoCompGranted() {
        OrgSubscription sub = OrgSubscription.builder().plan(Plan.STARTER).build();

        assertThat(sub.activeComp()).isNull();
    }

    @Test
    void activeComp_returnsGrantWhenOpenEnded() {
        OrgSubscription sub = OrgSubscription.builder()
                .plan(Plan.STARTER)
                .compedPlan(Plan.ENTERPRISE)
                .compedUntil(null)
                .build();

        assertThat(sub.activeComp()).isEqualTo(Plan.ENTERPRISE);
    }

    @Test
    void activeComp_returnsGrantWhileExpiryIsInTheFuture() {
        OrgSubscription sub = OrgSubscription.builder()
                .plan(Plan.NONE)
                .compedPlan(Plan.GROWTH)
                .compedUntil(Instant.now().plus(1, ChronoUnit.DAYS))
                .build();

        assertThat(sub.activeComp()).isEqualTo(Plan.GROWTH);
    }

    @Test
    void activeComp_isNullOnceExpiryHasPassed() {
        OrgSubscription sub = OrgSubscription.builder()
                .plan(Plan.STARTER)
                .compedPlan(Plan.ENTERPRISE)
                .compedUntil(Instant.now().minus(1, ChronoUnit.SECONDS))
                .build();

        // Expiry is evaluated on read, so this needs no cleanup job to take effect.
        assertThat(sub.activeComp()).isNull();
    }

    @Test
    void expiredComp_keepsItsAuditTrailOnTheRow() {
        Instant grantedAt = Instant.now().minus(30, ChronoUnit.DAYS);
        OrgSubscription sub = OrgSubscription.builder()
                .compedPlan(Plan.ENTERPRISE)
                .compedUntil(Instant.now().minus(1, ChronoUnit.DAYS))
                .compedReason("Q3 pilot")
                .compedAt(grantedAt)
                .build();

        // Stops applying, but the record of what was granted survives.
        assertThat(sub.activeComp()).isNull();
        assertThat(sub.getCompedPlan()).isEqualTo(Plan.ENTERPRISE);
        assertThat(sub.getCompedReason()).isEqualTo("Q3 pilot");
        assertThat(sub.getCompedAt()).isEqualTo(grantedAt);
    }
}
