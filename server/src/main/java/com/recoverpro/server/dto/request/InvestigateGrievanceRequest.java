package com.recoverpro.server.dto.request;

import lombok.Data;

import java.util.UUID;

@Data
public class InvestigateGrievanceRequest {

    /** Defaults to the acting user if omitted. */
    private UUID assignedToUserId;
}
