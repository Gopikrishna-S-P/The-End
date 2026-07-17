package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.recoverpro.server.enums.FraudCaseStatus;
import com.recoverpro.server.enums.FraudCategory;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FraudCaseResponse {

    private UUID id;
    private String caseNumber;
    private UUID organizationId;
    private UUID allocationId;
    private UUID borrowerId;
    private FraudCategory category;
    private BigDecimal amountInvolved;
    private LocalDate incidentDate;
    private String description;
    private String evidenceUrl;
    private FraudCaseStatus status;
    private UUID investigatedByUserId;
    private String investigationNotes;
    private String rejectionReason;
    private UUID reportedByUserId;
    private Instant reportedAt;
    private Instant cfrLookupAt;
    private String cfrLookupResult;
    private Instant frmsSubmittedAt;
    private String frmsAcknowledgement;
    private Instant createdAt;
    private Instant updatedAt;
}
