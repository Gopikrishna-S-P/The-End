package com.recoverpro.server.entity;

import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.Priority;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "assignments", indexes = {
        @Index(name = "idx_assignment_agent_date", columnList = "agent_id, assignment_date"),
        @Index(name = "idx_assignment_allocation", columnList = "allocation_id"),
        @Index(name = "idx_assignment_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "assigned_by", nullable = false)
    private UUID assignedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.PENDING;

    @Column(name = "assignment_date", nullable = false)
    private LocalDate assignmentDate;

    @Column(name = "sequence_order")
    private Integer sequenceOrder;

    @Column(name = "reassignment_reason", columnDefinition = "TEXT")
    private String reassignmentReason;

    @Column(name = "previous_agent_id")
    private UUID previousAgentId;

    @Column(name = "priority_level", length = 20)
    private String priorityLevel;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocation_id", insertable = false, updatable = false)
    private Allocation allocation;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}
