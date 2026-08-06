package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.UploadType;
import lombok.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ColumnSchemaResponse {

    private UUID id;
    private UUID organizationId;
    private UploadType entityType;
    private String name;
    private String displayName;
    private String dataType;
    private Boolean isRequired;
    private Boolean isSearchable;
    private Integer sortOrder;
    private Map<String, Object> validationRules;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
