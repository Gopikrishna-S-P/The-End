package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class ReconciliationRunResponse {
    private UUID id;
    private UUID organizationId;
    private String source;
    private LocalDate asOfDate;
    private int rowsIngested;
    private int matched;
    private int unmatched;
    private int amountDiff;
    private int duplicates;
    private int exceptions;
    private UUID reportJobId;
    private Instant createdAt;
}
