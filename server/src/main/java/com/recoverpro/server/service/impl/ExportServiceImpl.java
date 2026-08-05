package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.ReportJob;
import com.recoverpro.server.enums.ExportFormat;
import com.recoverpro.server.enums.ReportStatus;
import com.recoverpro.server.enums.ReportType;
import com.recoverpro.server.repository.ReportJobRepository;
import com.recoverpro.server.service.ExportService;
import com.recoverpro.server.service.export.ExcelReportBuilder;
import com.recoverpro.server.service.export.PdfReportBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Report export (Excel/PDF generation + file persistence). The actual document-building logic
 * lives in {@link ExcelReportBuilder} and {@link PdfReportBuilder} (SYSTEM-PLAN SP40 -- this class
 * was 666 lines mixing workbook/PDF construction with file I/O).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExportServiceImpl implements ExportService {

    private final ReportJobRepository reportJobRepository;

    private final ExcelReportBuilder excelReportBuilder = new ExcelReportBuilder();
    private final PdfReportBuilder pdfReportBuilder = new PdfReportBuilder();

    @Value("${app.storage.reports-path:./reports}")
    private String reportsPath;

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss").withZone(IST);

    @Override
    public byte[] generateExcel(Object reportData, String reportTypeName) {
        log.info("Generating Excel — type={}", reportTypeName);
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            ReportType type = ReportType.valueOf(reportTypeName);
            excelReportBuilder.build(wb, type, reportData);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Excel generation failed: {}", e.getMessage(), e);
            throw new BusinessException("Excel generation failed: " + e.getMessage());
        }
    }

    @Override
    public byte[] generatePdf(Object reportData, String reportTypeName) {
        log.info("Generating PDF — type={}", reportTypeName);
        try {
            ReportType type = ReportType.valueOf(reportTypeName);
            return pdfReportBuilder.build(type, reportData);
        } catch (Exception e) {
            log.error("PDF generation failed: {}", e.getMessage(), e);
            throw new BusinessException("PDF generation failed: " + e.getMessage());
        }
    }

    @Override
    public String saveToFile(byte[] content, String fileName, UUID orgId) {
        try {
            Path dir = Paths.get(reportsPath, String.valueOf(orgId));
            Files.createDirectories(dir);
            Path filePath = dir.resolve(fileName);
            Files.write(filePath, content);
            return filePath.toString();
        } catch (IOException e) {
            log.error("Failed to save report: {}", e.getMessage(), e);
            throw new BusinessException("Failed to save report file: " + e.getMessage());
        }
    }

    @Override
    public String buildFileName(String reportType, String format, UUID orgId) {
        String ext = ExportFormat.EXCEL.name().equalsIgnoreCase(format) ? "xlsx" : "pdf";
        return reportType.toLowerCase() + "_" + TS_FMT.format(Instant.now()) + "." + ext;
    }

    @Override
    public Resource exportReport(UUID jobId, UUID orgId) {
        ReportJob job = findReportJob(jobId, orgId);
        if (job.getStatus() != ReportStatus.COMPLETED)
            throw new BusinessException("Report not ready. Status: " + job.getStatus());
        if (job.getFilePath() == null)
            throw new BusinessException("Report file missing for job: " + jobId);
        try {
            Path filePath = Paths.get(job.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable())
                throw new BusinessException("Report file not accessible: " + jobId);
            return resource;
        } catch (MalformedURLException e) {
            throw new BusinessException("Invalid file path for job: " + jobId);
        }
    }

    @Override
    public ReportJob findReportJob(UUID jobId, UUID orgId) {
        return reportJobRepository.findByIdAndOrganizationId(jobId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Report job not found: " + jobId));
    }
}
