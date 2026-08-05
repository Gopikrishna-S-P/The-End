package com.recoverpro.server.service.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

@Slf4j
@Component
public class S3OrLocalStoragePort implements StoragePort {

    @Autowired(required = false)
    private S3Client s3Client;

    @Autowired(required = false)
    private S3Presigner s3Presigner;

    @Value("${aws.s3.enabled:false}")
    private boolean s3Enabled;

    @Value("${aws.s3.bucket:}")
    private String s3Bucket;

    @Override
    public String store(String s3Key, Path localPath, InputStream content, String contentType, long contentLength)
            throws IOException {
        if (s3Enabled) {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(s3Bucket).key(s3Key)
                            .contentType(contentType).contentLength(contentLength).build(),
                    RequestBody.fromInputStream(content, contentLength));
            log.info("Stored to S3: bucket={}, key={}", s3Bucket, s3Key);
            return s3Key;
        }
        Files.createDirectories(localPath.getParent());
        Files.copy(content, localPath, StandardCopyOption.REPLACE_EXISTING);
        log.info("Stored locally: path={}", localPath);
        return localPath.toString();
    }

    @Override
    public byte[] readBytes(String storedLocation) throws IOException {
        if (s3Enabled) {
            return s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(s3Bucket).key(storedLocation).build()).asByteArray();
        }
        return Files.readAllBytes(Paths.get(storedLocation));
    }

    @Override
    public void delete(String storedLocation) {
        if (s3Enabled) {
            try {
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(s3Bucket).key(storedLocation).build());
            } catch (Exception e) {
                log.warn("Could not delete S3 object {}: {}", storedLocation, e.getMessage());
            }
        } else {
            try {
                Files.deleteIfExists(Paths.get(storedLocation));
            } catch (IOException e) {
                log.warn("Could not delete local file {}: {}", storedLocation, e.getMessage());
            }
        }
    }

    @Override
    public String presignedUrl(String storedLocation, Duration ttl) {
        if (!s3Enabled || s3Presigner == null) return null;
        return s3Presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(s3Bucket).key(storedLocation).build())
                .build()).url().toString();
    }

    @Override
    public boolean isS3Enabled() {
        return s3Enabled;
    }
}
