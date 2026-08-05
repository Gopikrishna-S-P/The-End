package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.ApprovalAction;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalRequest {

    @NotNull
    private ApprovalAction action;

    @Size(max = 1000)
    private String remarks;
}
