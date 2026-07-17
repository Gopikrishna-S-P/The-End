package com.recoverpro.server.dto.response;

import com.recoverpro.server.entity.OrgSubscription.Plan;
import com.recoverpro.server.entity.OrgSubscription.Status;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class SubscriptionResponse {
    private Status status;
    private Plan plan;
    private Instant trialEndsAt;
    private Instant currentPeriodEnd;
    private Boolean cancelAtPeriodEnd;
    private boolean hasStripeCustomer;
    private boolean hasActiveSubscription;
    private int trialDaysLeft;
}
