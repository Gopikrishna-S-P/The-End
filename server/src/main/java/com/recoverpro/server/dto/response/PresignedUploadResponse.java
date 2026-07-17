package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class PresignedUploadResponse {
    private String uploadUrl;
    private String s3Key;
    private Instant expiresAt;
    private String requiredContentType;
}
