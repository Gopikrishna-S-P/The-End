package com.recoverpro.server.service.compliance;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * No-harassment template lint (design-doc §7.4 / RBI Recovery Agent
 * Code of Conduct).
 *
 * Scans rendered text for tokens / phrases configured in
 * {@code app.cadence.abuse-list} (CSV, case-insensitive). Returns the
 * matching tokens; an empty set means "clean".
 *
 * Default list: a conservative starter pulled from the RBI Recovery
 * Agent Code of Conduct + Fair Practices Code language. Operators
 * extend per legal review of complaint patterns from prior incidents.
 *
 * The linter is invoked from {@link com.recoverpro.server.service.MessageTemplateService}
 * before activation and can also run inline in the dispatcher path
 * with the rendered body -- call sites decide.
 */
@Slf4j
@Service
public class TemplateAbuseLinter {

    // Conservative starter list -- RBI Recovery Agent Code of Conduct +
    // Fair Practices Code. Must be a compile-time constant String to be
    // usable as an @Value default. Operators extend via the env override.
    private static final String DEFAULT_ABUSE_CSV =
            "threat,threaten,kill,police,jail,arrest,"
                    + "thief,fraud,criminal,useless,loser,"
                    + "shame,expose,tell your,tell everyone,"
                    + "caste,dare,consequences,warn you";

    @Value("${app.cadence.abuse-list:" + DEFAULT_ABUSE_CSV + "}")
    private String abuseListCsv;

    private volatile Set<String> compiled;

    /**
     * Returns the set of abuse tokens found in {@code text}. Empty set
     * means the text is clean against the configured list.
     */
    public Set<String> scan(String text) {
        if (text == null || text.isBlank()) return Set.of();
        String haystack = text.toLowerCase(Locale.ROOT);
        Set<String> hits = new LinkedHashSet<>();
        for (String token : tokens()) {
            // Word-boundary-aware match for short tokens; substring for phrases
            // (multi-word tokens) since spaces aren't word-boundary chars.
            if (token.contains(" ")) {
                if (haystack.contains(token)) hits.add(token);
            } else {
                Pattern p = Pattern.compile("\\b" + Pattern.quote(token) + "\\b");
                if (p.matcher(haystack).find()) hits.add(token);
            }
        }
        return hits;
    }

    public boolean isClean(String text) { return scan(text).isEmpty(); }

    private Set<String> tokens() {
        Set<String> c = compiled;
        if (c != null) return c;
        synchronized (this) {
            if (compiled != null) return compiled;
            Set<String> set = new HashSet<>();
            Arrays.stream(abuseListCsv.split(","))
                    .map(String::trim)
                    .map(s -> s.toLowerCase(Locale.ROOT))
                    .filter(s -> !s.isEmpty())
                    .forEach(set::add);
            compiled = set;
            return compiled;
        }
    }
}
