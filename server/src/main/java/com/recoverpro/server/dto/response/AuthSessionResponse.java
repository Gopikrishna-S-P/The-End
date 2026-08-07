package com.recoverpro.server.dto.response;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthSessionResponse {
    private UUID id;
    private String deviceInfo;
    private String ipAddress;
    private String geoCountry;
    private Instant createdAt;
    private Instant expiresAt;
    private boolean anomalyFlagged;
    private String anomalyReason;
    private boolean current;
}
