package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read-only KPI surface backed by the {@code v_kpi_*} views in V34
 * (design-doc §11.3).
 *
 * Each endpoint returns a list of map rows so the client tier can
 * render whatever shape the dashboard wants. The view layer keeps the
 * SQL on the DB side and the endpoint logic trivial; when KPI volume
 * grows, swap a view for a materialised view + scheduled refresh.
 */
@RestController
@RequestMapping("/api/v1/kpi")
@RequiredArgsConstructor
public class KpiController {

    private final JdbcTemplate jdbc;

    @GetMapping("/collection-efficiency")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ApiResponse<List<Map<String, Object>>> collectionEfficiency(
            @RequestParam UUID organizationId) {
        return ApiResponse.success(jdbc.queryForList(
                "SELECT * FROM v_kpi_collection_efficiency WHERE organization_id = ? "
                        + "ORDER BY bucket_month",
                organizationId));
    }

    @GetMapping("/roll-forward-rate")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ApiResponse<List<Map<String, Object>>> rollForwardRate(
            @RequestParam UUID organizationId) {
        return ApiResponse.success(jdbc.queryForList(
                "SELECT * FROM v_kpi_roll_forward_rate WHERE organization_id = ? "
                        + "ORDER BY month",
                organizationId));
    }

    @GetMapping("/ptp-kept-rate")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ApiResponse<List<Map<String, Object>>> ptpKeptRate(
            @RequestParam UUID organizationId) {
        return ApiResponse.success(jdbc.queryForList(
                "SELECT * FROM v_kpi_ptp_kept_rate WHERE organization_id = ?",
                organizationId));
    }

    @GetMapping("/contactability")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ApiResponse<List<Map<String, Object>>> contactability(
            @RequestParam UUID organizationId) {
        return ApiResponse.success(jdbc.queryForList(
                "SELECT * FROM v_kpi_contactability WHERE organization_id = ?",
                organizationId));
    }

    @GetMapping("/complaint-rate")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ApiResponse<List<Map<String, Object>>> complaintRate(
            @RequestParam UUID organizationId) {
        return ApiResponse.success(jdbc.queryForList(
                "SELECT * FROM v_kpi_complaint_rate WHERE organization_id = ? "
                        + "ORDER BY month",
                organizationId));
    }

    @GetMapping("/grievance-mttr")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ApiResponse<List<Map<String, Object>>> grievanceMttr(
            @RequestParam UUID organizationId) {
        return ApiResponse.success(jdbc.queryForList(
                "SELECT * FROM v_kpi_grievance_mttr WHERE organization_id = ?",
                organizationId));
    }

    @GetMapping("/reconciliation-gap")
    @PreAuthorize("hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN')")
    public ApiResponse<List<Map<String, Object>>> reconciliationGap(
            @RequestParam UUID organizationId) {
        return ApiResponse.success(jdbc.queryForList(
                "SELECT * FROM v_kpi_reconciliation_gap WHERE organization_id = ?",
                organizationId));
    }

    @GetMapping("/calling-hours-violations")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN')")
    public ApiResponse<List<Map<String, Object>>> callingHoursViolations(
            @RequestParam UUID organizationId) {
        return ApiResponse.success(jdbc.queryForList(
                "SELECT * FROM v_kpi_calling_hours_violations WHERE organization_id = ? "
                        + "ORDER BY day DESC",
                organizationId));
    }
}