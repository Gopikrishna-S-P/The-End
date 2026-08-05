package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.RagDocumentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class RagDocumentResponse {
    private UUID id;
    private String title;
    private String description;
    private String contentType;
    private RagDocumentStatus status;
    private String errorMessage;
    private UUID uploadedByUserId;
    private UUID supersedesDocumentId;
    private Instant createdAt;
    private Instant updatedAt;
}
