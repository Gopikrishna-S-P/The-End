package com.recoverpro.server.dto.response;

import lombok.*;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadRowResponse {
    private UUID id;
    private Integer rowNumber;
    private Map<String, Object> data;
}
