package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "file_processing_errors",
        indexes = {
                @Index(name = "idx_fpe_file_upload_id", columnList = "file_upload_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileProcessingError {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_upload_id", nullable = false)
    private FileUpload fileUpload;

    @Column(name = "row_number", nullable = false)
    private Integer rowNumber;

    @Column(name = "column_name", length = 200)
    private String columnName;

    @Column(name = "error_message", nullable = false, columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "raw_value", columnDefinition = "TEXT")
    private String rawValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
