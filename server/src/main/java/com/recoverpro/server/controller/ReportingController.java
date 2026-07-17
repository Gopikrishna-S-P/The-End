package com.recoverpro.server.controller;

import com.recoverpro.server.annotation.RequiresFeature;
import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.config.PlanFeatureMatrix;
import com.recoverpro.server.dto.request.ReportRequest;
import com.recoverpro.server.dto.response.*;
import com.recoverpro.server.enums.ReportStatus;
import com.recoverpro.server.enums.ReportType;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.dto.response.FoDayReportResponse;
import com.recoverpro.server.dto.response.MisEodReportResponse;
import com.recoverpro.server.service.MisEodReportService;
import com.recoverpro.server.service.ReportingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize(ReportingController.READERS)
public class ReportingController {

    static final String READERS = "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL')";

    private final ReportingService reportingService;
    private final MisEodReportService misEodReportService;

    @GetMapping("/agent/{agentId}/performance")
    public ResponseEntity<ApiResponse<AgentPerformanceResponse>> getAgentPerformance(
            @PathVariable UUID agentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) UUID orgId) {
        return ResponseEntity.ok(ApiResponse.success(
                reportingService.getAgentPerformance(agentId, date != null ? date : LocalDate.now(), orgId)));
    }

    @GetMapping("/agent/rankings")
    @RequiresFeature(PlanFeatureMatrix.ADVANCED_REPORTS)
    public ResponseEntity<ApiResponse<PagedResponse<AgentPerformanceResponse>>> getAgentRankings(
            @RequestParam UUID orgId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AgentPerformanceResponse> result = reportingService.getAgentRankings(
                orgId, date != null ? date : LocalDate.now(),
                PageRequest.of(page, size, Sort.by("efficiencyScore").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @GetMapping("/team/performance")
    @RequiresFeature(PlanFeatureMatrix.ADVANCED_REPORTS)
    public ResponseEntity<ApiResponse<TeamPerformanceResponse>> getTeamPerformance(
            @RequestParam UUID orgId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate fromDate = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate toDate = to != null ? to : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(reportingService.getTeamPerformance(orgId, fromDate, toDate)));
    }

    @GetMapping("/visit-completion/daily")
    public ResponseEntity<ApiResponse<DailyVisitCompletionResponse>> getDailyVisitCompletion(
            @RequestParam UUID orgId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(
                reportingService.getDailyVisitCompletion(orgId, date != null ? date : LocalDate.now())));
    }

    @GetMapping("/collection-efficiency")
    @RequiresFeature(PlanFeatureMatrix.ADVANCED_REPORTS)
    public ResponseEntity<ApiResponse<CollectionEfficiencyResponse>> getCollectionEfficiency(
            @RequestParam UUID orgId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate fromDate = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate toDate = to != null ? to : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(reportingService.getCollectionEfficiency(orgId, fromDate, toDate)));
    }

    @GetMapping("/reassignment-frequency")
    @RequiresFeature(PlanFeatureMatrix.ADVANCED_REPORTS)
    public ResponseEntity<ApiResponse<ReassignmentFrequencyResponse>> getReassignmentFrequency(
            @RequestParam UUID orgId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate fromDate = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate toDate = to != null ? to : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(reportingService.getReassignmentFrequency(orgId, fromDate, toDate)));
    }

    @GetMapping("/loan-book/history")
    @RequiresFeature(PlanFeatureMatrix.ADVANCED_REPORTS)
    public ResponseEntity<ApiResponse<PagedResponse<MonthlyLoanBookResponse>>> getLoanBookHistory(
            @RequestParam UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Page<MonthlyLoanBookResponse> result = reportingService.getMonthlyLoanBookHistory(
                orgId, PageRequest.of(page, size, Sort.by("snapshotMonth").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }

    @GetMapping("/loan-book")
    @RequiresFeature(PlanFeatureMatrix.ADVANCED_REPORTS)
    public ResponseEntity<ApiResponse<MonthlyLoanBookResponse>> getLoanBook(
            @RequestParam UUID orgId,
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(ApiResponse.success(reportingService.getMonthlyLoanBook(orgId, month, year)));
    }

    @GetMapping("/bank-reconciliation")
    @RequiresFeature(PlanFeatureMatrix.ADVANCED_REPORTS)
    public ResponseEntity<ApiResponse<BankReconciliationResponse>> getBankReconciliation(
            @RequestParam UUID orgId,
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(ApiResponse.success(reportingService.getBankReconciliation(orgId, month, year)));
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ReportJobResponse>> enqueueReport(
            @Valid @RequestBody ReportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("POST /reports/generate - type={} format={} orgId={}",
                request.getReportType(), request.getExportFormat(), request.getOrganizationId());
        ReportJobResponse job = reportingService.enqueueReport(request, principal.getId());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.of("Report generation queued", job));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<ApiResponse<ReportJobResponse>> getJobStatus(
            @PathVariable UUID jobId,
            @RequestParam UUID orgId) {
        return ResponseEntity.ok(ApiResponse.success(reportingService.getJobStatus(jobId, orgId)));
    }

    @GetMapping("/fo-day")
    public ResponseEntity<ApiResponse<FoDayReportResponse>> getFoDay(
            @RequestParam UUID orgId,
            @RequestParam UUID agentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(
                misEodReportService.getFoDay(orgId, agentId, date != null ? date : LocalDate.now())));
    }

    @GetMapping("/mis-eod")
    public ResponseEntity<ApiResponse<MisEodReportResponse>> getMisEod(
            @RequestParam UUID orgId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate reportDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(misEodReportService.generate(orgId, reportDate)));
    }

    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<PagedResponse<ReportJobResponse>>> getJobs(
            @RequestParam UUID orgId,
            @RequestParam(required = false) ReportType type,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ReportJobResponse> result = reportingService.getJobs(
                orgId, type, status, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(result)));
    }
}