package com.recoverpro.server.dto.response;

import com.recoverpro.server.entity.FeatureFlag;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class FeatureFlagAdminResponse {
    private UUID id;
    private UUID organizationId;
    private String flagKey;
    private boolean enabled;
    private String description;
    private FeatureFlag.FlagSource source;
    private UUID updatedByUserId;
    private Instant updatedAt;

    public static FeatureFlagAdminResponse from(FeatureFlag f) {
        return FeatureFlagAdminResponse.builder()
                .id(f.getId())
                .organizationId(f.getOrganizationId())
                .flagKey(f.getFlagKey())
                .enabled(Boolean.TRUE.equals(f.getEnabled()))
                .description(f.getDescription())
                .source(f.getSource())
                .updatedByUserId(f.getUpdatedByUserId())
                .updatedAt(f.getUpdatedAt())
                .build();
    }
}
