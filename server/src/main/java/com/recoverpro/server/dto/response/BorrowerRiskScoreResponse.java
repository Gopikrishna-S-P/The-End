package com.recoverpro.server.dto.response;

import com.recoverpro.server.enums.AbilityLevel;
import com.recoverpro.server.enums.BorrowerSegment;
import com.recoverpro.server.enums.IntentLevel;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class BorrowerRiskScoreResponse {
    private UUID id;
    private UUID organizationId;
    private UUID borrowerId;
    private String modelVersion;
    private BigDecimal defaultPropensity;
    private IntentLevel intent;
    private AbilityLevel ability;
    private BorrowerSegment segment;
    private Map<String, Object> featureAttributions;
    private Map<String, Object> featureSnapshot;
    private Instant scoredAt;
    private Instant createdAt;
}
