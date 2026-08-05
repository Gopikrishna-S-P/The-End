package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class GrievanceOfficerResponse {
    private UUID id;
    private UUID organizationId;
    private String name;
    private String designation;
    private String email;
    private String phone;
    private String address;
    private UUID updatedByUserId;
    private Instant createdAt;
    private Instant updatedAt;
}
