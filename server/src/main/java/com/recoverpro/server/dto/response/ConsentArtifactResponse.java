package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.ConsentPurpose;
import com.recoverpro.server.enums.ConsentScope;
import com.recoverpro.server.enums.ConsentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ConsentArtifactResponse {
    private UUID id;
    private UUID borrowerId;
    private UUID organizationId;
    private ConsentPurpose purpose;
    private ConsentScope scope;
    private String termsText;
    private String termsVersion;
    private String signedHash;
    private String evidenceRef;
    private Instant grantedAt;
    private Instant expiresAt;
    private Instant revokedAt;
    private String revokedReason;
    private ConsentStatus status;
    private Instant createdAt;
}
