package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.GrievanceCategory;
import com.recoverpro.server.enums.GrievanceStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class GrievanceResponse {
    private UUID id;
    private String ticketNumber;
    private UUID organizationId;
    private UUID allocationId;
    private UUID raisedByUserId;
    private String borrowerName;
    private String borrowerEmail;
    private String borrowerPhone;
    private GrievanceCategory category;
    private String subject;
    private String description;
    private String evidenceUrl;
    private GrievanceStatus status;
    private UUID assignedToUserId;
    private String resolutionNotes;
    private Instant acknowledgementDueAt;
    private Instant acknowledgedAt;
    private Instant resolutionDueAt;
    private Instant resolvedAt;
    private Instant closedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
