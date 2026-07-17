package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DirectPermissionResponse {
    private UUID id;
    private String name;
    private String resource;
    private String action;
    private String description;
    private String scope;
    private boolean granted;
    private Instant grantedAt;
}
