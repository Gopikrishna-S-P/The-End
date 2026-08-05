package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NpaFlagRequest {

    @NotNull
    private UUID organizationId;

    @NotNull
    private Integer overdueThresholdDays;
}
