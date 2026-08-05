package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.CallOutcome;
import com.recoverpro.server.enums.RecordingStatus;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallLogResponse {

    private UUID id;
    private UUID allocationId;
    private UUID agentId;
    private Instant initiatedAt;
    private Instant endedAt;
    private Integer durationSeconds;
    private CallOutcome outcome;
    private String phoneMasked;
    private String notes;
    private RecordingStatus recordingStatus;
}
