package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PingRequest {

    @NotNull
    private Double lat;

    @NotNull
    private Double lng;

    private Double accuracy;
}
