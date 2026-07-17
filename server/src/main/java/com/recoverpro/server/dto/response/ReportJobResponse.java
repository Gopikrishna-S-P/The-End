package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.ExportFormat;
import com.recoverpro.server.enums.ReportStatus;
import com.recoverpro.server.enums.ReportType;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportJobResponse {

    private UUID id;
    private UUID organizationId;
    private ReportType reportType;
    private ReportStatus status;
    private ExportFormat exportFormat;
    private String fileName;
    private Long fileSizeBytes;
    private String errorMessage;
    private UUID requestedBy;
    private Boolean isScheduled;
    private Instant startedAt;
    private Instant completedAt;
    private Instant createdAt;
}
