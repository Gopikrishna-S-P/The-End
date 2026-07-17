package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.FraudCaseStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TransitionFraudCaseRequest {

    @NotNull
    private FraudCaseStatus newStatus;

    private String investigationNotes;

    @Size(max = 500)
    private String rejectionReason;
}
