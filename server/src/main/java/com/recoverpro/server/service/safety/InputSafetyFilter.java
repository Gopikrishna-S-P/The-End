package com.recoverpro.server.service.safety;

import com.recoverpro.server.enums.SafetyDecision;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class InputSafetyFilter {

    private static final List<String> ROLE_SPOOF_TOKENS = List.of(
            "system:", "<|im_start|>", "<|im_end|>", "[inst]", "[/inst]",
            "<s>", "</s>", "<<sys>>", "<</sys>>", "###system", "### system",
            "<!-- system"
    );

    private static final List<String> HARMFUL_KEYWORDS = List.of(
            "hack", "exploit", "bypass", "jailbreak", "ignore instructions",
            "ignore previous", "forget instructions", "act as", "pretend you are",
            "you are now", "new persona", "override", "disregard"
    );

    private static final List<String> OFF_TOPIC_KEYWORDS = List.of(
            "cricket", "movie", "film", "recipe", "cooking", "weather", "sports",
            "football", "politics", "religion", "stock market", "crypto", "bitcoin",
            "dating", "relationship", "gaming", "song", "music", "celebrity",
            "astrology", "horoscope", "joke", "meme"
    );

    private static final List<String> ALLOWED_TOPIC_HINTS = List.of(
            "loan", "borrower", "collection", "payment", "ptp", "promise",
            "assignment", "visit", "case", "agent", "amount", "due", "overdue",
            "negotiate", "script", "follow up", "contact", "deposit", "emi",
            "repayment", "settlement", "waiver", "schedule", "reminder", "help",
            "how", "what", "when", "suggest", "advice", "today", "status"
    );

    /**
     * Checks arbitrary text (e.g. tool/RAG observations re-entering the model as
     * context) for the same role-spoofing markers {@link #filter} rejects on
     * direct user input. Unlike {@link #filter}, this never blocks - retrieved
     * document content legitimately containing these words (a compliance PDF
     * describing prompt-injection risk, for instance) must still be returned to
     * the caller; this only flags it for the caller to log/monitor.
     */
    public boolean containsInjectionMarkers(String text) {
        if (text == null || text.isBlank()) return false;
        String normalized = text.toLowerCase();
        return ROLE_SPOOF_TOKENS.stream().anyMatch(normalized::contains);
    }

    public SafetyFilterResult filter(String input) {
        if (input == null || input.isBlank()) {
            return SafetyFilterResult.blocked(SafetyDecision.BLOCKED_HARMFUL, "Empty input is not allowed.");
        }

        String normalized = input.toLowerCase().trim();

        for (String token : ROLE_SPOOF_TOKENS) {
            if (normalized.contains(token)) {
                log.warn("InputSafetyFilter: blocked role-spoof token '{}'", token);
                return SafetyFilterResult.blocked(SafetyDecision.BLOCKED_HARMFUL,
                        "Your message contains content that cannot be processed.");
            }
        }

        for (String keyword : HARMFUL_KEYWORDS) {
            if (normalized.contains(keyword)) {
                log.warn("InputSafetyFilter: blocked harmful keyword '{}'", keyword);
                return SafetyFilterResult.blocked(SafetyDecision.BLOCKED_HARMFUL,
                        "Your message contains content that cannot be processed.");
            }
        }

        for (var pattern : PiiPatterns.ALL) {
            if (pattern.matcher(input).find()) {
                log.warn("InputSafetyFilter: blocked PII pattern '{}'", pattern.pattern());
                return SafetyFilterResult.blocked(SafetyDecision.BLOCKED_PII,
                        "Please do not share personal identification details in the chat.");
            }
        }

        boolean hasAllowedTopic = ALLOWED_TOPIC_HINTS.stream().anyMatch(normalized::contains);
        if (!hasAllowedTopic) {
            for (String offTopic : OFF_TOPIC_KEYWORDS) {
                if (normalized.contains(offTopic)) {
                    log.warn("InputSafetyFilter: blocked off-topic keyword '{}'", offTopic);
                    return SafetyFilterResult.blocked(SafetyDecision.BLOCKED_OFF_TOPIC,
                            "I can only assist with collection, loan, and field work related questions.");
                }
            }
        }

        return SafetyFilterResult.allowed(input.trim());
    }
}
