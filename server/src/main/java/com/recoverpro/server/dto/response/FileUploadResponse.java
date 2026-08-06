package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.enums.UploadType;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileUploadResponse {

    private UUID id;
    private UUID organizationId;
    private String originalFilename;
    private String contentType;
    private Long fileSizeBytes;
    private String sha256Hash;
    private UploadType uploadType;
    private Boolean isHistoricalImport;
    private FileUploadStatus status;
    private Integer totalRows;
    private Integer processedRows;
    private Integer successfulRows;
    private Integer failedRows;
    private String errorMessage;
    private UUID uploadedByUserId;
    private Instant createdAt;
    private Instant updatedAt;
    private Double progressPercentage;
    private Integer autoAssignedCount;
    private Integer autoAssignFailed;
}
