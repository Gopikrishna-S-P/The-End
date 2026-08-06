package com.recoverpro.server.service;

import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.response.FileProcessingErrorResponse;
import com.recoverpro.server.dto.response.FileUploadResponse;
import com.recoverpro.server.enums.UploadType;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface FileUploadService {

    FileUploadResponse initiateUpload(MultipartFile file, UUID organizationId, UUID userId,
                                      UploadType uploadType, boolean historicalImport);

    FileUploadResponse getUploadStatus(UUID fileUploadId);

    PagedResponse<FileUploadResponse> getUploadsByOrganization(UUID organizationId, Pageable pageable);

    PagedResponse<FileProcessingErrorResponse> getProcessingErrors(UUID fileUploadId, Pageable pageable);

    void softDeleteFileUpload(UUID fileUploadId, UUID userId);
}
