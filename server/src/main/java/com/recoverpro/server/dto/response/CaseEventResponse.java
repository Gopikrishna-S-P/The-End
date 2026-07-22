package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.CaseEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaseEventResponse {
    private Instant timestamp;
    private CaseEventType eventType;
    private String summary;
    private String actorRole;
    private UUID actorId;
    private String actorName;
    private String sourceTable;
    private UUID sourceId;
    private Map<String, Object> data;
    private String narrative;
}
