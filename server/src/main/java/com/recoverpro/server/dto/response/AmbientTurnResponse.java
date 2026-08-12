package com.recoverpro.server.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AmbientTurnResponse {

    private boolean speak;
    private String text;
}
