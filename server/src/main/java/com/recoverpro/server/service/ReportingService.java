package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.ReportRequest;
import com.recoverpro.server.dto.response.*;
import com.recoverpro.server.dto.response.*;
import com.recoverpro.server.enums.ReportStatus;
import com.recoverpro.server.enums.ReportType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface ReportingService {

    AgentPerformanceResponse getAgentPerformance(UUID agentId, LocalDate date, UUID orgId);

    Page<AgentPerformanceResponse> getAgentRankings(UUID orgId, LocalDate date, Pageable pageable);

    TeamPerformanceResponse getTeamPerformance(UUID orgId, LocalDate from, LocalDate to);

    DailyVisitCompletionResponse getDailyVisitCompletion(UUID orgId, LocalDate date);

    CollectionEfficiencyResponse getCollectionEfficiency(UUID orgId, LocalDate from, LocalDate to);

    ReassignmentFrequencyResponse getReassignmentFrequency(UUID orgId, LocalDate from, LocalDate to);

    Page<MonthlyLoanBookResponse> getMonthlyLoanBookHistory(UUID orgId, Pageable pageable);

    MonthlyLoanBookResponse getMonthlyLoanBook(UUID orgId, int month, int year);

    BankReconciliationResponse getBankReconciliation(UUID orgId, int month, int year);

    ReportJobResponse enqueueReport(ReportRequest request, UUID requestedBy);

    ReportJobResponse getJobStatus(UUID jobId, UUID orgId);

    Page<ReportJobResponse> getJobs(UUID orgId, ReportType type, ReportStatus status, Pageable pageable);
}