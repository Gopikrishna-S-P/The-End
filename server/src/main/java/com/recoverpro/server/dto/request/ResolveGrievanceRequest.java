package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResolveGrievanceRequest {

    @NotBlank
    private String resolutionNotes;
}
