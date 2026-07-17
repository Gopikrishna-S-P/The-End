package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private boolean enabled;
    private boolean accountLocked;
    private boolean mfaEnabled;
    private UUID organizationId;
    private Instant lastLoginAt;
    private Instant createdAt;
    private Set<RoleResponse> roles;
}
