package com.recoverpro.server.dto.response;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserActionAuditResponse {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private String action;
    private String details;
    private Instant createdAt;
}
