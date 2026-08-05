package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AllocationsSection {
    private long totalAllocations;
    private long assignedCount;
    private long unassignedCount;
    private long npaFlaggedCount;
    private List<CaseAgeBucket> caseAgeBuckets;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CaseAgeBucket {
        private String label;
        private long count;
    }
}
