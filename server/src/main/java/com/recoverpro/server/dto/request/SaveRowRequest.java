package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class SaveRowRequest {

    @NotNull
    private Map<String, Object> data;
}
