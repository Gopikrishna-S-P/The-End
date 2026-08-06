package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.UploadType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ColumnSchemaRequest {

    @NotNull(message = "Organization ID is required")
    private UUID organizationId;

    /** Which upload type this column belongs to. Absent means the allocation book, as before. */
    private UploadType entityType;

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @NotBlank(message = "Display name is required")
    @Size(max = 200, message = "Display name must not exceed 200 characters")
    private String displayName;

    @NotBlank(message = "Data type is required")
    private String dataType;

    private Boolean isRequired;
    private Boolean isSearchable;
    private Integer sortOrder;
    private Map<String, Object> validationRules;
}
