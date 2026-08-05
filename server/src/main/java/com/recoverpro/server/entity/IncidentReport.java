package com.recoverpro.server.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "incident_reports", indexes = {
        @Index(name = "idx_incident_agent",     columnList = "agent_id"),
        @Index(name = "idx_incident_triggered", columnList = "triggered_at"),
        @Index(name = "idx_incident_resolved",  columnList = "resolved_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncidentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "shift_id")
    private UUID shiftId;

    @Column(name = "triggered_at", nullable = false)
    private Instant triggeredAt;

    @Column(name = "last_known_lat")
    private Double lastKnownLat;

    @Column(name = "last_known_lng")
    private Double lastKnownLng;

    @Column(name = "last_known_accuracy")
    private Double lastKnownAccuracy;

    @Type(JsonType.class)
    @Column(name = "recent_pings", columnDefinition = "jsonb")
    private List<Map<String, Object>> recentPings;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by_user_id")
    private UUID resolvedByUserId;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); updatedAt = createdAt; }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
