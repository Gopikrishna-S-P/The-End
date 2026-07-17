package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReviewRequestDto {

    @NotNull
    private boolean approved;

    private String notes;
}
