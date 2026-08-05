package com.recoverpro.server.dto.request;

import lombok.Data;

import java.util.UUID;

@Data
public class SettlementBorrowerAcceptRequest {

    /** DPDP consent artifact recorded for the borrower's acceptance, if any. */
    private UUID borrowerConsentArtifactId;
}
