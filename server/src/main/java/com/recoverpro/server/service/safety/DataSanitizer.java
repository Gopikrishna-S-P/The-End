package com.recoverpro.server.service.safety;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class DataSanitizer {

    private static final Pattern SAFE_NAME = Pattern.compile("[^a-zA-Z\\s]");

    public String stripPii(String text) {
        if (text == null) return null;
        String result = text;
        for (Pattern p : PiiPatterns.ALL) {
            result = p.matcher(result).replaceAll("[REDACTED]");
        }
        return result;
    }

    public boolean containsPii(String text) {
        if (text == null) return false;
        return PiiPatterns.ALL.stream().anyMatch(p -> p.matcher(text).find());
    }

    public String sanitizeAgentName(String name) {
        if (name == null || name.isBlank()) return "Agent";
        String cleaned = SAFE_NAME.matcher(name.trim()).replaceAll("").trim();
        if (cleaned.isBlank()) return "Agent";
        return cleaned.length() > 50 ? cleaned.substring(0, 50) : cleaned;
    }
}
