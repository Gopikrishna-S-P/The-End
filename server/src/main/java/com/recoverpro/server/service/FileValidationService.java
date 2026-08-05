package com.recoverpro.server.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface FileValidationService {

    void validateFile(MultipartFile file);

    String computeSha256Hash(MultipartFile file);

    boolean isDuplicateFile(String sha256Hash, UUID organizationId);
}
