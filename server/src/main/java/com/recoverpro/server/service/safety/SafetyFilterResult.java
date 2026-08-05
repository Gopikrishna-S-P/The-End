package com.recoverpro.server.service.safety;

import com.recoverpro.server.enums.SafetyDecision;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SafetyFilterResult {

    private final SafetyDecision decision;
    private final String reason;
    private final String sanitizedContent;

    public boolean isAllowed() { return decision.isAllowed(); }

    public static SafetyFilterResult allowed(String content) {
        return SafetyFilterResult.builder()
                .decision(SafetyDecision.ALLOWED)
                .sanitizedContent(content)
                .build();
    }

    public static SafetyFilterResult blocked(SafetyDecision decision, String reason) {
        return SafetyFilterResult.builder()
                .decision(decision)
                .reason(reason)
                .build();
    }
}
