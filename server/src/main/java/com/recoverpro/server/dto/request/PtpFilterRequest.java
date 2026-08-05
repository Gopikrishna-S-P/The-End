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
    private String borrowerName;
    private Boolean reminderSent;
}
