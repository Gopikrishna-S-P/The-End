package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_location_pings", indexes = {
        @Index(name = "idx_ping_agent_recorded", columnList = "agent_id, recorded_at DESC"),
        @Index(name = "idx_ping_shift",          columnList = "shift_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentLocationPing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "shift_id")
    private UUID shiftId;

    @Column(name = "visit_session_id")
    private UUID visitSessionId;

    @Column(name = "lat", nullable = false)
    private Double lat;

    @Column(name = "lng", nullable = false)
    private Double lng;

    @Column(name = "accuracy")
    private Double accuracy;

    @Column(name = "battery_level")
    private Double batteryLevel;

    @Column(name = "mock_location_detected", nullable = false)
    @Builder.Default
    private boolean mockLocationDetected = false;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); if (recordedAt == null) recordedAt = Instant.now(); }
}
