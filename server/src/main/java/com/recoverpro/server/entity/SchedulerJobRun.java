package com.recoverpro.server.entity;

import com.recoverpro.server.enums.JobRunStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scheduler_job_runs", indexes = {
        @Index(name = "idx_sjr_job_started", columnList = "job_name, started_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchedulerJobRun {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "job_name", length = 120, nullable = false)
    private String jobName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private JobRunStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "rows_processed")
    private Integer rowsProcessed;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
}
