package com.recoverpro.server.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface FileStorageService {

    void store(UUID fileUploadId, MultipartFile file);

    byte[] retrieve(UUID fileUploadId);

    void delete(UUID fileUploadId);
}
