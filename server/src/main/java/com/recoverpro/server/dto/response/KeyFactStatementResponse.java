package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.KfsGenerationReason;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class KeyFactStatementResponse {
    private UUID id;
    private UUID allocationId;
    private UUID organizationId;
    private UUID restructureProposalId;
    private String versionLabel;
    private Boolean isCurrent;
    private KfsGenerationReason generationReason;
    private BigDecimal sanctionedAmount;
    private BigDecimal netDisbursedAmount;
    private BigDecimal totalInterestCharge;
    private BigDecimal processingFee;
    private BigDecimal otherCharges;
    private BigDecimal totalPayable;
    private BigDecimal aprPercent;
    private BigDecimal interestRatePercent;
    private String interestType;
    private Integer tenureMonths;
    private BigDecimal emiAmount;
    private String repaymentFrequency;
    private String penalChargesDescription;
    private Integer coolingOffDays;
    private LocalDate firstEmiDate;
    private LocalDate lastEmiDate;
    private String contentSha256;
    private String pdfSha256;
    private UUID generatedByUserId;
    private Instant createdAt;
    private Instant updatedAt;
}
