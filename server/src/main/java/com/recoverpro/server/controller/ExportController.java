package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.ReportJob;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.ExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports/export")
@RequiredArgsConstructor
@Slf4j
public class ExportController {

    private final ExportService exportService;
    private final OrgIsolationGuard orgIsolationGuard;

    @GetMapping("/jobs/{jobId}/download")
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL')")
    public ResponseEntity<Resource> downloadReport(
            @PathVariable UUID jobId,
            @RequestParam UUID orgId) {
        log.info("Download report: jobId={}, orgId={}", jobId, orgId);

        // orgId is client-supplied (MANAGER/TL are org-scoped, not just admins) -- never trust it
        // without checking the caller actually belongs to it. RLS on report_jobs is fail-closed
        // so this couldn't leak another tenant's report, but there was no app-layer check either.
        if (!orgIsolationGuard.belongsToOrg(orgId)) {
            throw new ResourceNotFoundException("Report job not found: " + jobId);
        }

        ReportJob job = exportService.findReportJob(jobId, orgId);
        Resource resource = exportService.exportReport(jobId, orgId);

        MediaType mediaType = job.getExportFormat().name().equalsIgnoreCase("PDF")
                ? MediaType.APPLICATION_PDF
                : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(job.getFileName())
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(resource);
    }
}