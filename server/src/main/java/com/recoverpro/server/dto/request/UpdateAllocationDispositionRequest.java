package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.Disp;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAllocationDispositionRequest {

    @NotNull(message = "Disposition is required")
    private Disp disposition;

    private String reason;
}
