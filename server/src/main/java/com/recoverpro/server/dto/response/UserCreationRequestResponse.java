package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.recoverpro.server.entity.UserCreationRequest.RequestStatus;
import com.recoverpro.server.entity.UserCreationRequest.RequestedRole;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserCreationRequestResponse {

    private UUID id;
    private String requestedEmail;
    private String requestedFirstName;
    private String requestedLastName;
    private RequestedRole requestedRole;
    private String requestedStaffRole;
    private UUID organizationId;
    private String organizationName;
    private UUID requestedById;
    private String requestedByName;
    private RequestStatus status;
    private UUID reviewedById;
    private String reviewedByName;
    private Instant reviewedAt;
    private String reviewNotes;
    private UUID createdUserId;
    private Instant createdAt;
}
