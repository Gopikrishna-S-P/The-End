package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.PtpStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PtpResponse {

    private UUID id;
    private UUID allocationId;
    private UUID agentId;
    private String agentName;
    private String loanNumber;
    private String borrowerName;
    private LocalDate promisedDate;
    private BigDecimal promisedAmount;
    private BigDecimal collectedAmount;
    private PtpStatus status;
    private String contactNotes;
    private String cancellationReason;
    private String brokenReason;
    private Boolean reminderSent;
    private Instant reminderSentAt;
    private Instant fulfilledAt;
    private Instant brokenAt;
    private UUID createdBy;
    private UUID updatedBy;
    private Instant createdAt;
    private Instant updatedAt;
    private BigDecimal fulfillmentPercentage;
}
