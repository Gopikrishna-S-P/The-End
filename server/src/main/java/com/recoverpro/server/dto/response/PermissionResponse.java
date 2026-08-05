package com.recoverpro.server.dto.response;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionResponse {
    private UUID id;
    private String name;
    private String resource;
    private String action;
    private String description;
    private String scope;
}
