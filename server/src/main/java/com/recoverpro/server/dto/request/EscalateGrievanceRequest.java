package com.recoverpro.server.dto.request;

import lombok.Data;

@Data
public class EscalateGrievanceRequest {

    /** Optional context, logged (not persisted to a new column -- see design spec). */
    private String remarks;
}
