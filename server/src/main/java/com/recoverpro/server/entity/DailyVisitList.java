package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "daily_visit_list",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_dvl_org_agent_date_case",
                columnNames = {"organization_id", "agent_user_id", "dispatch_date", "allocation_id"}),
        indexes = {
                @Index(name = "idx_dvl_agent_date", columnList = "agent_user_id, dispatch_date"),
                @Index(name = "idx_dvl_org_date",   columnList = "organization_id, dispatch_date")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyVisitList {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "agent_user_id", nullable = false)
    private UUID agentUserId;

    @Column(name = "dispatch_date", nullable = false)
    private LocalDate dispatchDate;

    @Column(name = "allocation_id", nullable = false)
    private UUID allocationId;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private Integer sequenceOrder = 0;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
