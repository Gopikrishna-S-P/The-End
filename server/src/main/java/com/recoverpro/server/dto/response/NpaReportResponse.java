package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.recoverpro.server.enums.NpaRiskLevel;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NpaReportResponse {

    private UUID organizationId;
    private LocalDate reportDate;

    private Integer totalNpaCount;
    private BigDecimal totalNpaAmount;
    private BigDecimal npaRatioPct;

    private Map<NpaRiskLevel, Integer> countByRiskLevel;
    private Map<NpaRiskLevel, BigDecimal> amountByRiskLevel;

    private List<NpaRecordResponse> records;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class NpaRecordResponse {
        private UUID allocationId;
        private String loanNumber;
        private String borrowerName;
        private BigDecimal outstandingAmount;
        private Integer overdueDays;
        private NpaRiskLevel riskLevel;
        private LocalDate flaggedDate;
        private LocalDate lastPaymentDate;
        private UUID assignedAgentId;
    }
}
