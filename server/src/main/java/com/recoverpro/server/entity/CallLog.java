package com.recoverpro.server.entity;

import com.recoverpro.server.enums.CallOutcome;
import com.recoverpro.server.enums.RecordingStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "call_logs", indexes = {
        @Index(name = "idx_call_log_agent",         columnList = "agent_id"),
        @Index(name = "idx_call_log_allocation",    columnList = "allocation_id"),
        @Index(name = "idx_call_log_org",            columnList = "organization_id"),
        @Index(name = "idx_call_log_initiated_at",   columnList = "initiated_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "initiated_at", nullable = false)
    private Instant initiatedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", length = 25)
    private CallOutcome outcome;

    @Column(name = "phone_masked", length = 20)
    private String phoneMasked;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "recording_path", length = 512)
    private String recordingPath;

    @Enumerated(EnumType.STRING)
    @Column(name = "recording_status", length = 20)
    private RecordingStatus recordingStatus;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
