package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class GenerateKfsRequest {

    @NotNull
    private UUID restructureProposalId;
}
