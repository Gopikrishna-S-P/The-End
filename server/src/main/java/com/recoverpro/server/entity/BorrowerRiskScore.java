package com.recoverpro.server.entity;

import com.recoverpro.server.enums.AbilityLevel;
import com.recoverpro.server.enums.BorrowerSegment;
import com.recoverpro.server.enums.IntentLevel;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "borrower_risk_scores", indexes = {
        @Index(name = "idx_risk_borrower",  columnList = "borrower_id"),
        @Index(name = "idx_risk_org",       columnList = "organization_id"),
        @Index(name = "idx_risk_segment",   columnList = "segment"),
        @Index(name = "idx_risk_scored_at", columnList = "scored_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BorrowerRiskScore {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "borrower_id", nullable = false)
    private UUID borrowerId;

    @Column(name = "model_version", nullable = false, length = 30)
    private String modelVersion;

    @Column(name = "default_propensity", nullable = false, precision = 5, scale = 4)
    private BigDecimal defaultPropensity;

    @Enumerated(EnumType.STRING)
    @Column(name = "intent", nullable = false, length = 20)
    private IntentLevel intent;

    @Enumerated(EnumType.STRING)
    @Column(name = "ability", nullable = false, length = 20)
    private AbilityLevel ability;

    @Enumerated(EnumType.STRING)
    @Column(name = "segment", nullable = false, length = 30)
    private BorrowerSegment segment;

    @Type(JsonType.class)
    @Column(name = "feature_attributions", columnDefinition = "jsonb")
    private Map<String, Object> featureAttributions;

    @Type(JsonType.class)
    @Column(name = "feature_snapshot", columnDefinition = "jsonb")
    private Map<String, Object> featureSnapshot;

    @Column(name = "scored_at", nullable = false)
    private Instant scoredAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
