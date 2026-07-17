package com.recoverpro.server.entity;

import com.recoverpro.server.enums.ExportFormat;
import com.recoverpro.server.enums.ReportStatus;
import com.recoverpro.server.enums.ReportType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "report_jobs", indexes = {
        @Index(name = "idx_rj_org_type",     columnList = "organization_id, report_type"),
        @Index(name = "idx_rj_status",       columnList = "status"),
        @Index(name = "idx_rj_requested_by", columnList = "requested_by"),
        @Index(name = "idx_rj_scheduled",    columnList = "is_scheduled")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false, length = 40)
    private ReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private ReportStatus status = ReportStatus.QUEUED;

    @Enumerated(EnumType.STRING)
    @Column(name = "export_format", nullable = false, length = 5)
    private ExportFormat exportFormat;

    @Column(name = "parameters", columnDefinition = "TEXT")
    private String parameters;

    @Column(name = "file_path", length = 512)
    private String filePath;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "requested_by")
    private UUID requestedBy;

    @Column(name = "is_scheduled", nullable = false)
    @Builder.Default
    private Boolean isScheduled = false;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); updatedAt = createdAt; }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
