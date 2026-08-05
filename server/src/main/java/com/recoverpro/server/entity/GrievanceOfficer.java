package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * The RBI-mandated Grievance Redressal Officer (GRO) contact, one per org
 * (uq_grievance_officer_org) -- a settings record, not a workflow entity.
 */
@Entity
@Table(name = "grievance_officers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrievanceOfficer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false, unique = true)
    private UUID organizationId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "designation", nullable = false, length = 200)
    private String designation;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "updated_by_user_id")
    private UUID updatedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
