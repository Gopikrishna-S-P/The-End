package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DistanceSummaryEntry {

    private UUID agentId;
    private String agentName;
    private Double totalDistanceMetres;
    private int sessionCount;
}
