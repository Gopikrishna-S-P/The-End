package com.recoverpro.server.dto.request;
import java.util.UUID;

import com.recoverpro.server.enums.ExportFormat;
import com.recoverpro.server.enums.ReportType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportRequest {

    @NotNull(message = "Organization ID is required")
    private UUID organizationId;

    @NotNull(message = "Report type is required")
    private ReportType reportType;

    @NotNull(message = "Export format is required")
    private ExportFormat exportFormat;

    private LocalDate fromDate;
    private LocalDate toDate;

    private UUID agentId;
    private Long teamId;

    private Integer month;
    private Integer year;
}


