package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.ShiftStatus;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentShiftResponse {
    private UUID id;
    private UUID agentId;
    private UUID organizationId;
    private Instant startedAt;
    private Instant endedAt;
    private ShiftStatus status;
}
