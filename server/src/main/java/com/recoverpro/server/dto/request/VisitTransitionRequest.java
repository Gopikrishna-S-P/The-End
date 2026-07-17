package com.recoverpro.server.dto.request;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisitTransitionRequest {

    private Double lat;
    private Double lng;
}
