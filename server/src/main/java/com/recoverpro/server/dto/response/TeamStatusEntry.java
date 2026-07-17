package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.recoverpro.server.enums.VisitSessionStatus;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TeamStatusEntry {

    private UUID agentId;
    private String agentName;
    private VisitSessionStatus activeStatus;
    private UUID activeSessionId;
    private String activeLoanNumber;
    private String activeBorrowerName;
    private Instant statusSince;
    private Double totalDistanceMetres;
}
