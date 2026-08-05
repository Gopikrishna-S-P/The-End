package com.recoverpro.server.dto.request;

import lombok.Data;

import java.util.UUID;

@Data
public class RestructureBorrowerAcceptRequest {

    /** DPDP consent artifact recorded for the borrower's e-signature, if any. */
    private UUID borrowerConsentArtifactId;
}
