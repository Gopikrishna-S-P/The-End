package com.recoverpro.server.service.tax;

import java.util.regex.Pattern;

/**
 * Indian GSTIN (Goods and Services Tax Identification Number) format validation and state-code
 * extraction. The 15-character structure (2-digit state code + 10-char PAN + 1-digit entity
 * number + literal 'Z' + 1 checksum char) is the CBIC-specified format, stable and unchanged
 * since GST's 2017 rollout -- unlike GST rates or filing thresholds, this is not something that
 * needs external confirmation to implement correctly.
 * <p>
 * This class validates STRUCTURE only (regex shape), not the embedded checksum digit or whether
 * the GSTIN is actually registered/active with the tax authority. A structurally valid but
 * fabricated or cancelled GSTIN will pass this check; real-world verification would require a
 * live GSTN lookup, which is out of scope here.
 */
public final class Gstin {

    private static final Pattern GSTIN_PATTERN =
            Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$");

    private Gstin() {}

    public static boolean isValid(String gstin) {
        return gstin != null && GSTIN_PATTERN.matcher(gstin).matches();
    }

    /** First two characters of a valid GSTIN are the registered state code. Throws if the input
     *  isn't a structurally valid GSTIN -- callers must check {@link #isValid} first, or catch. */
    public static String stateCode(String gstin) {
        if (!isValid(gstin)) {
            throw new IllegalArgumentException("Not a structurally valid GSTIN: " + gstin);
        }
        return gstin.substring(0, 2);
    }
}
