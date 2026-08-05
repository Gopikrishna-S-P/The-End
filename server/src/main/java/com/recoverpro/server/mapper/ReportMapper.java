package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.response.AgentPerformanceResponse;
import com.recoverpro.server.dto.response.MonthlyLoanBookResponse;
import com.recoverpro.server.dto.response.NpaReportResponse;
import com.recoverpro.server.dto.response.ReportJobResponse;
import com.recoverpro.server.entity.AgentPerformanceSnapshot;
import com.recoverpro.server.entity.MonthlyLoanBookSnapshot;
import com.recoverpro.server.entity.NpaRecord;
import com.recoverpro.server.entity.ReportJob;
import org.springframework.stereotype.Component;

@Component
public class ReportMapper {

    public NpaReportResponse.NpaRecordResponse toNpaRecordResponse(NpaRecord record) {
        if (record == null) return null;
        return NpaReportResponse.NpaRecordResponse.builder()
                .id(record.getId())
                .allocationId(record.getAllocationId())
                .loanNumber(record.getLoanNumber())
                .borrowerName(record.getBorrowerName())
                .outstandingAmount(record.getOutstandingAmount())
                .overdueDays(record.getOverdueDays())
                .riskLevel(record.getRiskLevel())
                .flaggedDate(record.getFlaggedDate())
                .lastPaymentDate(record.getLastPaymentDate())
                .assignedAgentId(record.getAssignedAgentId())
                .build();
    }

    public MonthlyLoanBookResponse toMonthlyLoanBookResponse(MonthlyLoanBookSnapshot snap) {
        if (snap == null) return null;
        return MonthlyLoanBookResponse.builder()
                .organizationId(snap.getOrganizationId())
                .snapshotMonth(snap.getSnapshotMonth())
                .totalLoans(snap.getTotalLoans())
                .totalOutstandingAmount(snap.getTotalOutstandingAmount())
                .totalCollectedAmount(snap.getTotalCollectedAmount())
                .totalNpaCount(snap.getTotalNpaCount())
                .totalNpaAmount(snap.getTotalNpaAmount())
                .totalAssignedLoans(snap.getTotalAssignedLoans())
                .totalUnassignedLoans(snap.getTotalUnassignedLoans())
                .collectionEfficiencyPct(snap.getCollectionEfficiencyPct())
                .recoveryRatePct(snap.getRecoveryRatePct())
                .build();
    }

    public AgentPerformanceResponse toAgentPerformanceResponse(AgentPerformanceSnapshot snap) {
        if (snap == null) return null;
        return AgentPerformanceResponse.builder()
                .agentId(snap.getAgentId())
                .organizationId(snap.getOrganizationId())
                .snapshotDate(snap.getSnapshotDate())
                .totalAssigned(snap.getTotalAssigned())
                .totalVisited(snap.getTotalVisited())
                .totalCollected(snap.getTotalCollected())
                .totalPending(snap.getTotalPending())
                .totalReassignedOut(snap.getTotalReassignedOut())
                .totalReassignedIn(snap.getTotalReassignedIn())
                .amountCollected(snap.getAmountCollected())
                .amountOutstanding(snap.getAmountOutstanding())
                .visitCompletionRate(snap.getVisitCompletionRate())
                .collectionEfficiency(snap.getCollectionEfficiency())
                .efficiencyScore(snap.getEfficiencyScore())
                .rankInOrg(snap.getRankInOrg())
                .build();
    }

    public ReportJobResponse toJobResponse(ReportJob job) {
        if (job == null) return null;
        return ReportJobResponse.builder()
                .id(job.getId())
                .organizationId(job.getOrganizationId())
                .reportType(job.getReportType())
                .status(job.getStatus())
                .exportFormat(job.getExportFormat())
                .fileName(job.getFileName())
                .fileSizeBytes(job.getFileSizeBytes())
                .errorMessage(job.getErrorMessage())
                .requestedBy(job.getRequestedBy())
                .isScheduled(job.getIsScheduled())
                .startedAt(job.getStartedAt())
                .completedAt(job.getCompletedAt())
                .createdAt(job.getCreatedAt())
                .build();
    }
}
