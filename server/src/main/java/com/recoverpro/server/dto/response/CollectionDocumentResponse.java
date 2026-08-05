package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CollectionDocumentResponse {

    private UUID id;
    private String fileName;
    private String fileUrl;
    private String documentType;
    private Instant uploadedAt;
}
