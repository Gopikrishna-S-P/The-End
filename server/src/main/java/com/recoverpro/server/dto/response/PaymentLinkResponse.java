package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.Channel;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PaymentLinkResponse {
    private UUID id;
    private UUID intentId;
    private String token;
    private String shortUrl;
    private String targetUri;
    private Channel issuedViaChannel;
    private boolean singleUse;
    private Instant expiresAt;
    private Instant consumedAt;
    private Instant createdAt;
}
