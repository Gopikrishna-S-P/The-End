package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.recoverpro.server.enums.VisitSessionStatus;
import com.recoverpro.server.enums.VisitSource;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VisitSessionResponse {

    private UUID id;
    private UUID allocationId;
    private String loanNumber;
    private String borrowerName;
    private UUID agentId;
    private String agentName;
    private VisitSessionStatus status;
    private VisitSource source;
    private Instant startedAt;
    private Double startedLat;
    private Double startedLng;
    private Instant reachedAt;
    private Double reachedLat;
    private Double reachedLng;
    private Instant waitingSince;
    private Instant closedAt;
    private Double distanceMetres;
    private UUID visitLogId;
}
