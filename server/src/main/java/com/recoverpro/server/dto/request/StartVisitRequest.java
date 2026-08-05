package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.VisitSource;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartVisitRequest {

    @NotNull
    private UUID allocationId;

    @NotNull
    private VisitSource source;

    private UUID dailyVisitListId;
    private UUID assignmentId;
    private Double lat;
    private Double lng;
}
