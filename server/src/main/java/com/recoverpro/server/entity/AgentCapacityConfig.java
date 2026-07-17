package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agent_capacity_config", indexes = {
        @Index(name = "idx_capacity_org", columnList = "organization_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentCapacityConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false, unique = true)
    private UUID organizationId;

    @Column(name = "max_cases_per_agent_per_day", nullable = false)
    @Builder.Default
    private Integer maxCasesPerAgentPerDay = 50;

    @Column(name = "allow_weekend_assignments", nullable = false)
    @Builder.Default
    private Boolean allowWeekendAssignments = false;

    @Column(name = "allow_holiday_assignments", nullable = false)
    @Builder.Default
    private Boolean allowHolidayAssignments = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
