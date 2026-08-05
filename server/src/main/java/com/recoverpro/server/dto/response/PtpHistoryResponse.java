package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.PtpStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PtpHistoryResponse {

    private UUID id;
    private UUID ptpId;
    private UUID allocationId;
    private PtpStatus previousStatus;
    private PtpStatus newStatus;
    private BigDecimal collectedAmountSnapshot;
    private String changeReason;
    private UUID changedBy;
    private String changedByName;
    private Instant changedAt;
}
