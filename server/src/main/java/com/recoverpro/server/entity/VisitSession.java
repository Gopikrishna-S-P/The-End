package com.recoverpro.server.entity;

import com.recoverpro.server.enums.VisitSessionStatus;
import com.recoverpro.server.enums.VisitSource;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "visit_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 20)
    private VisitSource source;

    @Column(name = "daily_visit_list_id")
    private UUID dailyVisitListId;

    @Column(name = "assignment_id")
    private UUID assignmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private VisitSessionStatus status = VisitSessionStatus.STARTED;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "started_lat")
    private Double startedLat;

    @Column(name = "started_lng")
    private Double startedLng;

    @Column(name = "reached_at")
    private Instant reachedAt;

    @Column(name = "reached_lat")
    private Double reachedLat;

    @Column(name = "reached_lng")
    private Double reachedLng;

    @Column(name = "waiting_since")
    private Instant waitingSince;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "distance_metres", nullable = false)
    @Builder.Default
    private Double distanceMetres = 0.0;

    @Column(name = "visit_log_id")
    private UUID visitLogId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}
