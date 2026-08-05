package com.recoverpro.server.entity;

import com.recoverpro.server.enums.FileUploadStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "file_uploads",
        indexes = {
                @Index(name = "idx_file_uploads_organization_id", columnList = "organization_id"),
                @Index(name = "idx_file_uploads_status", columnList = "status"),
                @Index(name = "idx_file_uploads_sha256_hash", columnList = "sha256_hash")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "original_filename", nullable = false, length = 500)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes;

    @Column(name = "sha256_hash", nullable = false, length = 64)
    private String sha256Hash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private FileUploadStatus status = FileUploadStatus.PENDING;

    @Column(name = "total_rows")
    private Integer totalRows;

    @Column(name = "processed_rows")
    @Builder.Default
    private Integer processedRows = 0;

    @Column(name = "successful_rows")
    @Builder.Default
    private Integer successfulRows = 0;

    @Column(name = "failed_rows")
    @Builder.Default
    private Integer failedRows = 0;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "column_order", columnDefinition = "jsonb")
    private List<String> columnOrder;

    @Column(name = "uploaded_by_user_id")
    private UUID uploadedByUserId;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by_user_id")
    private UUID deletedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "auto_assigned_count", nullable = false)
    @Builder.Default
    private Integer autoAssignedCount = 0;

    @Column(name = "auto_assign_failed", nullable = false)
    @Builder.Default
    private Integer autoAssignFailed = 0;

    @OneToMany(mappedBy = "fileUpload", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Allocation> allocations = new ArrayList<>();

    @OneToMany(mappedBy = "fileUpload", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<FileProcessingError> processingErrors = new ArrayList<>();
}
