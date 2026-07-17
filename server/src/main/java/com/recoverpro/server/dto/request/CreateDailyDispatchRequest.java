package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * TL submits the curated visit list for one FO on one date. Calling this
 * REPLACES whatever list previously existed for that (org, agent, date) tuple.
 */
@Data
public class CreateDailyDispatchRequest {
    @NotNull
    private UUID agentId;

    @NotNull
    private LocalDate date;

    @NotNull
    private List<UUID> caseIds;
}