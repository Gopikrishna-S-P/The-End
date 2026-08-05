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
public class SystemPromptResponse {

    private UUID id;
    private String promptKey;
    private String promptTemplate;
    private Integer version;
    private Boolean isActive;
    private String description;
    private UUID updatedBy;
    private Instant updatedAt;
}
