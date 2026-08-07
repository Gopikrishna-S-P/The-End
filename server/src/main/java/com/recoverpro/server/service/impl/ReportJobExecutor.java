package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.ReportJob;
import com.recoverpro.server.enums.ExportFormat;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.enums.ReportStatus;
import com.recoverpro.server.repository.ReportJobRepository;
import com.recoverpro.server.service.ExportService;
import com.recoverpro.server.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import java.util.function.Function;

/**
 * Runs a queued {@link ReportJob} on the reporting executor pool. A separate bean (rather than a
 * method on ReportingServiceImpl called via a self-injected {@code @Lazy} proxy) so the
 * {@code @Async}/{@code @Transactional(REQUIRES_NEW)} annotations actually apply -- self-invocation
 * within one class bypasses the Spring AOP proxy (SYSTEM-PLAN SP38).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReportJobExecutor {

    private final ReportJobRepository reportJobRepository;
    private final ExportService exportService;
    private final NotificationService notificationService;

    @Async("reportingTaskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processJobAsync(UUID jobId, Function<ReportJob, Object> reportDataBuilder) {
        ReportJob job = reportJobRepository.findById(jobId).orElse(null);
        if (job == null) return;
        try {
            job.setStatus(ReportStatus.GENERATING);
            job.setStartedAt(Instant.now());
            reportJobRepository.save(job);

            Object reportData = reportDataBuilder.apply(job);
            byte[] content = job.getExportFormat() == ExportFormat.EXCEL
                    ? exportService.generateExcel(reportData, job.getReportType().name())
                    : exportService.generatePdf(reportData, job.getReportType().name());

            String fileName = exportService.buildFileName(
                    job.getReportType().name(), job.getExportFormat().name(), job.getOrganizationId());
            String filePath = exportService.saveToFile(content, fileName, job.getOrganizationId());

            job.setStatus(ReportStatus.COMPLETED);
            job.setFilePath(filePath);
            job.setFileName(fileName);
            job.setFileSizeBytes((long) content.length);
            job.setCompletedAt(Instant.now());
            reportJobRepository.save(job);
            log.info("Report job completed: id={} file={}", jobId, fileName);

            if (job.getRequestedBy() != null) {
                notificationService.create(job.getRequestedBy(), job.getOrganizationId(), NotificationType.REPORT_READY,
                        "Your report is ready: " + job.getReportType(),
                        "The " + job.getReportType() + " report (" + job.getExportFormat()
                                + ") you requested has finished generating and is ready to download.");
            }

        } catch (Exception e) {
            log.error("Report job failed: id={} error={}", jobId, e.getMessage(), e);
            job.setStatus(ReportStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(Instant.now());
            reportJobRepository.save(job);
        }
    }
}
