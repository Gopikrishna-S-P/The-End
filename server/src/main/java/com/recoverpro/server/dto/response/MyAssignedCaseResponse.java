package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.Disp;
import com.recoverpro.server.enums.Priority;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MyAssignedCaseResponse {
    private UUID assignmentId;
    private LocalDate assignmentDate;
    private AssignmentStatus assignmentStatus;
    private Priority priority;
    private Integer sequenceOrder;
    private UUID allocationId;
    private String loanNumber;
    private String borrowerName;
    private BigDecimal outstandingAmount;
    private BigDecimal totalDue;
    private Boolean npaFlagged;
    private AllocationStatus allocationStatus;
    private Map<String, Object> dynamicData;
    private LocalDate lastVisitDate;
    private Disp lastVisitDisposition;
}
