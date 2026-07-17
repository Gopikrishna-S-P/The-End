package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class BorrowerResponse {
    private UUID id;
    private UUID organizationId;
    private String ckycId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String address;
    private boolean erasurePending;
    private Instant createdAt;
    private Instant updatedAt;
}
