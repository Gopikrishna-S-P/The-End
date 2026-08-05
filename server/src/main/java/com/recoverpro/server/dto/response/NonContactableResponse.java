package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NonContactableResponse {
    private UUID id;
    private UUID organizationId;
    private UUID allocationId;
    private UUID visitId;
    private UUID agentId;
    private String reason;
    private String notes;
    private Instant createdAt;
}
