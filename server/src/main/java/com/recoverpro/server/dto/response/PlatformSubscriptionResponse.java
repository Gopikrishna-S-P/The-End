package com.recoverpro.server.dto.response;

import com.recoverpro.server.entity.OrgSubscription.Plan;
import com.recoverpro.server.entity.OrgSubscription.Status;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PlatformSubscriptionResponse {
    private UUID orgId;
    private String orgName;
    private String orgCode;
    private Status status;
    private Plan plan;
    private String stripeCustomerId;
    private String stripeSubscriptionId;
    private Instant trialEndsAt;
    private Instant currentPeriodEnd;
    private Boolean cancelAtPeriodEnd;
    private Instant createdAt;
    private int trialDaysLeft;
}
