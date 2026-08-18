package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.PtpStatus;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PtpFilterRequest {

    private UUID allocationId;
    private UUID agentId;
    private PtpStatus status;
    private LocalDate promisedDateFrom;
    private LocalDate promisedDateTo;
    private String loanNumber;

    /**
     * SYSTEM-PLAN 26.1: matched via a blind-index (HMAC-SHA256 prefix-token) lookup against
     * PtpRecord.borrowerName, which is encrypted -- prefix-per-word match only ("smith" or "sm"
     * matches "Smith"), not substring-anywhere. No current web or mobile screen sends this param
     * (both search client-side over the already-fetched, decrypted page instead); it's exercised
     * directly via the API.
     */
    private String borrowerName;
    private Boolean reminderSent;
}
