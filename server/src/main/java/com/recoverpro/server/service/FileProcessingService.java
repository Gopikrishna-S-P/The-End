package com.recoverpro.server.service;

import java.util.UUID;

public interface FileProcessingService {

    void processFileAsync(UUID fileUploadId, UUID organizationId);
}
