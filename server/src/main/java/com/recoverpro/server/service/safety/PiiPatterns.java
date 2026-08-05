package com.recoverpro.server.service.safety;

import java.util.List;
import java.util.regex.Pattern;

final class PiiPatterns {

    static final List<Pattern> ALL = List.of(
            Pattern.compile("\\b[6-9]\\d{9}\\b"),                                    // Indian mobile
            Pattern.compile("\\b\\d{12}\\b"),                                         // Aadhaar
            Pattern.compile("\\b[A-Z]{5}\\d{4}[A-Z]\\b"),                            // PAN
            Pattern.compile("\\b[A-Z]{2}\\d{2}\\s?[A-Z]{4}\\d{7}\\b"),              // Passport
            Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}"), // Email
            Pattern.compile("\\b\\d{4}[\\s\\-]?\\d{4}[\\s\\-]?\\d{4}[\\s\\-]?\\d{4}\\b"), // Card
            Pattern.compile("\\b\\d{9,18}\\b")                                        // Account/IFSC
    );

    private PiiPatterns() {}
}
