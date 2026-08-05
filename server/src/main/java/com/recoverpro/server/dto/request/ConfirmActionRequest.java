package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfirmActionRequest {

    @NotBlank(message = "actionId is required")
    private String actionId;

    private boolean confirmed;
}
