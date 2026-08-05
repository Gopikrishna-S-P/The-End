package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class AddColumnRequest {

    @NotBlank
    @Pattern(regexp = "^[a-z0-9_]+$", message = "Column name must be lowercase letters, digits, or underscores")
    private String columnName;

    private String defaultValue = "";
}
