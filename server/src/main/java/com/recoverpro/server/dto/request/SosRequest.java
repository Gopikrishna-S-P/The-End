package com.recoverpro.server.dto.request;

import lombok.Data;

@Data
public class SosRequest {

    // agentId is deliberately NOT a client-supplied field -- it's always the authenticated
    // principal's own id (see AgentFieldController.sos). A client-supplied agent identity here
    // would let any authenticated user trigger a false SOS as someone else.

    private Double lat;
    private Double lng;
    private Double accuracy;
    private String notes;
}
