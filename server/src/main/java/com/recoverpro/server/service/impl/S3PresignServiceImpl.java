package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.PresignedUploadResponse;
import com.recoverpro.server.service.S3PresignService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "aws.s3.enabled", havingValue = "true")
public class S3PresignServiceImpl implements S3PresignService {

    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.s3.presign.expiry-minutes:15}")
    private int expiryMinutes;

    @Override
    public PresignedUploadResponse generateUploadUrl(UUID orgId, String originalFilename, String contentType) {
        // Key format: uploads/{orgId}/{uuid}/{filename}
        // UUID segment prevents key guessing / enumeration.
        String key = "uploads/" + orgId + "/" + UUID.randomUUID() + "/" + sanitiseFilename(originalFilename);

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expiryMinutes))
                .putObjectRequest(putRequest)
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presignRequest);
        Instant expiresAt = presigned.expiration();

        log.info("Pre-signed S3 upload URL generated: bucket={} key={} expiresAt={}", bucket, key, expiresAt);

        return PresignedUploadResponse.builder()
                .uploadUrl(presigned.url().toString())
                .s3Key(key)
                .expiresAt(expiresAt)
                .requiredContentType(contentType)
                .build();
    }

    private static String sanitiseFilename(String name) {
        if (name == null || name.isBlank()) return "upload";
        // Strip path components and keep only safe characters.
        String base = name.replaceAll(".*/", "").replaceAll("[^a-zA-Z0-9._\\-]", "_");
        return base.length() > 200 ? base.substring(0, 200) : base;
    }
}
