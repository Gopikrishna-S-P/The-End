package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrgOverviewSection {
    private UUID organizationId;
    private String organizationName;
    private String organizationCode;
    private long totalAllocations;
    private long assignedAllocations;
    private long unassignedAllocations;
    private long totalUsers;
    private BigDecimal collectionVolumeThisMonth;
    private long collectionsThisMonth;
    private BigDecimal outstandingTotal;
}
