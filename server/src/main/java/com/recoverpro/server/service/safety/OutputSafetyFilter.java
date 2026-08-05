package com.recoverpro.server.service.safety;

import com.recoverpro.server.enums.SafetyDecision;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutputSafetyFilter {

    private final DataSanitizer dataSanitizer;

    private static final List<String> HARMFUL_OUTPUT_KEYWORDS = List.of(
            "ignore your instructions", "new system prompt", "you are not friday",
            "forget everything", "as an ai with no restrictions"
    );

    public SafetyFilterResult filter(String output) {
        if (output == null || output.isBlank()) {
            log.warn("OutputSafetyFilter: model returned empty response");
            return SafetyFilterResult.blocked(SafetyDecision.BLOCKED_HARMFUL,
                    "The AI returned an empty response. Please try again.");
        }

        String normalized = output.toLowerCase();
        for (String keyword : HARMFUL_OUTPUT_KEYWORDS) {
            if (normalized.contains(keyword)) {
                log.warn("OutputSafetyFilter: blocked harmful content in model output");
                return SafetyFilterResult.blocked(SafetyDecision.BLOCKED_HARMFUL,
                        "The response could not be delivered. Please rephrase your question.");
            }
        }

        String sanitized = dataSanitizer.stripPii(output);
        if (!sanitized.equals(output)) {
            log.warn("OutputSafetyFilter: PII stripped from model output");
        }

        return SafetyFilterResult.allowed(sanitized);
    }
}
