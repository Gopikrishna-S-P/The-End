package com.recoverpro.server.lucien.ambient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses the {"speak": bool, "text": "..."} contract LUCIEN_AMBIENT_VISIT_V1 requires from the
 * model. The model is a small local/GPU-hosted LLM, not a hosted API with guaranteed structured
 * output — it sometimes wraps the JSON in a markdown code fence or adds a stray sentence, so
 * this extracts the first {...} block rather than requiring the whole response to parse as JSON.
 * Anything that still fails to parse is treated as "stay silent" rather than surfaced as an
 * error — an ambient turn that mistakenly stays silent is far less harmful mid-visit than one
 * that crashes the request or accidentally speaks garbage to the borrower.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AmbientReplyParser {

    private static final Pattern JSON_OBJECT = Pattern.compile("\\{[\\s\\S]*\\}");

    private final ObjectMapper objectMapper;

    public AmbientReply parse(String rawContent) {
        if (rawContent == null || rawContent.isBlank()) {
            return AmbientReply.silent();
        }
        Matcher matcher = JSON_OBJECT.matcher(rawContent);
        if (!matcher.find()) {
            log.debug("Ambient reply had no JSON object, treating as silent: contentLength={}", rawContent.length());
            return AmbientReply.silent();
        }
        try {
            JsonNode node = objectMapper.readTree(matcher.group());
            boolean speak = node.path("speak").asBoolean(false);
            String text = node.path("text").isNull() ? null : node.path("text").asText(null);
            if (speak && (text == null || text.isBlank())) {
                log.debug("Ambient reply had speak=true but no text, treating as silent: contentLength={}",
                        rawContent.length());
                return AmbientReply.silent();
            }
            return new AmbientReply(speak, speak ? text : null);
        } catch (Exception e) {
            log.debug("Malformed ambient reply JSON, treating as silent: contentLength={}, error={}",
                    rawContent.length(), e.getClass().getSimpleName());
            return AmbientReply.silent();
        }
    }

    public record AmbientReply(boolean speak, String text) {
        public static AmbientReply silent() {
            return new AmbientReply(false, null);
        }
    }
}
