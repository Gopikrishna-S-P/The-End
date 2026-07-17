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
public class OrganizationSummaryResponse {
    private UUID id;
    private String name;
    private String code;
    private String orgType;
    private Boolean isActive;
    private Instant createdAt;
    private long userCount;
    /** Email of the primary Org Admin if there's exactly one. */
    private String orgAdminEmail;
}
