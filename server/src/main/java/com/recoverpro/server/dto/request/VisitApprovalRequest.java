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
public class VisitApprovalRequest {

    @NotNull(message = "Approval action is required")
    private ApprovalAction action;

    @Size(max = 2000)
    private String remarks;
}
