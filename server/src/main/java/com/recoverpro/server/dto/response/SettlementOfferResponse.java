package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.SettlementOfferStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class SettlementOfferResponse {
    private UUID id;
    private UUID organizationId;
    private UUID allocationId;
    private UUID borrowerId;
    private BigDecimal outstandingAtOffer;
    private BigDecimal offeredAmount;
    private BigDecimal discountPct;
    private Integer tenorDays;
    private Instant validityUntil;
    private String conditions;
    private SettlementOfferStatus status;
    private UUID draftedByUserId;
    private UUID proposedByUserId;
    private Instant proposedAt;
    private UUID approvedByUserId;
    private Instant approvedAt;
    private UUID rejectedByUserId;
    private Instant rejectedAt;
    private String rejectionReason;
    private Boolean complianceReviewRequired;
    private UUID complianceReviewedByUserId;
    private Instant complianceReviewedAt;
    private Instant acceptedAt;
    private UUID borrowerConsentArtifactId;
    private Instant paidAt;
    private UUID paymentIntentId;
    private Instant createdAt;
    private Instant updatedAt;
}
