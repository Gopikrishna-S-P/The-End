package com.recoverpro.server.dto.response;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileProcessingErrorResponse {

    private UUID id;
    private UUID fileUploadId;
    private Integer rowNumber;
    private String columnName;
    private String errorMessage;
    private String rawValue;
    private Instant createdAt;
}
