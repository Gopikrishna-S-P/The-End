package com.recoverpro.server.service;

import com.recoverpro.server.entity.ReportJob;
import org.springframework.core.io.Resource;

import java.util.UUID;

public interface ExportService {

    Resource exportReport(UUID jobId, UUID orgId);

    byte[] generatePdf(Object reportData, String reportTitle);

    byte[] generateExcel(Object reportData, String reportTitle);

    // Fix: Added for coupling fix - service layer should handle repository access
    ReportJob findReportJob(UUID jobId, UUID orgId);

    String saveToFile(byte[] content, String fileName, UUID orgId);

    String buildFileName(String reportType, String format, UUID orgId);
}