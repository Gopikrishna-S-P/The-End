package com.recoverpro.server.service.importer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Header-tolerant value extraction shared by every processor. Historical exports come out
 * of whatever system the org used before, so headers vary in case, spacing and punctuation;
 * matching is normalised rather than exact.
 */
public final class ImportValues {

    /** Mirrors the formats VisitImportServiceImpl already accepts, so both paths agree. */
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy")
    );

    private ImportValues() {}

    private static String normalize(String s) {
        return s.toLowerCase().replace("_", "").replace(" ", "").replace("-", "");
    }

    /**
     * Returns the value whose header matches one of the given aliases, comparing on a
     * normalised form so "Loan Number", "loan_number" and "LOANNUMBER" are one column.
     *
     * <p>Matching is deliberately exact after normalisation. An earlier version fell back to
     * substring matching, which silently resolved a PTP file's "collected_amount" into
     * promised_amount because "collectedamount" contains "amount" - wrong figure, no error,
     * on money data. Unrecognised headers are now surfaced by the upfront header check
     * instead of being guessed at.
     */
    public static String find(Map<String, String> row, String... aliases) {
        for (String alias : aliases) {
            String target = normalize(alias);
            for (Map.Entry<String, String> entry : row.entrySet()) {
                if (normalize(entry.getKey()).equals(target)) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }

    /** True when the file carries a column for this field under any accepted spelling. */
    public static boolean hasColumn(Set<String> headers, ImportFieldSpec spec) {
        for (String name : spec.allNames()) {
            String target = normalize(name);
            for (String header : headers) {
                if (normalize(header).equals(target)) return true;
            }
        }
        return false;
    }

    /** Every accepted spelling, across every field a processor understands, normalised once. */
    public static Set<String> normalizedFieldNames(List<ImportFieldSpec> specs) {
        Set<String> names = new java.util.HashSet<>();
        for (ImportFieldSpec spec : specs) {
            for (String name : spec.allNames()) {
                names.add(normalize(name));
            }
        }
        return names;
    }

    /**
     * The entries of {@code data} that do NOT belong to any dedicated field in {@code specs}.
     * This is the single authority for what a "dynamic/extra data" column is allowed to be:
     * a raw upload row must never carry a copy of a field that already has its own (and, for
     * borrower name/CKYC/phone/email, encrypted) home on the entity or its linked Borrower.
     * Always returns {@code Map<String, Object>} regardless of the input's value type, since
     * both callers (Allocation.dynamicData, and the manual-row-entry JSON payload) need that
     * shape rather than whatever the input happened to be declared as.
     */
    public static Map<String, Object> stripDedicatedFields(Map<String, ?> data, List<ImportFieldSpec> specs) {
        Set<String> dedicated = normalizedFieldNames(specs);
        Map<String, Object> extra = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, ?> entry : data.entrySet()) {
            if (!dedicated.contains(normalize(entry.getKey()))) {
                extra.put(entry.getKey(), entry.getValue());
            }
        }
        return extra;
    }

    public static String findRequired(Map<String, String> row, ImportFieldSpec spec) {
        String value = find(row, spec.allNames());
        if (value == null || value.isBlank()) {
            throw new RowValidationException(spec.name(), spec.label() + " is required", value);
        }
        return value.trim();
    }

    public static BigDecimal parseDecimal(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String cleaned = raw.replace("₹", "").replace(",", "").replace("Rs.", "").replace("Rs", "").trim();
        try {
            return new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public static Boolean parseBoolean(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim().toLowerCase();
        if (s.equals("true") || s.equals("yes") || s.equals("y") || s.equals("1")) return Boolean.TRUE;
        if (s.equals("false") || s.equals("no") || s.equals("n") || s.equals("0")) return Boolean.FALSE;
        return null;
    }

    public static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim();
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try {
                return LocalDate.parse(s, fmt);
            } catch (DateTimeParseException ignored) {
                // try the next supported layout
            }
        }
        return null;
    }

    public static LocalDate parseRequiredDate(String raw, String column, String label) {
        LocalDate date = parseDate(raw);
        if (date == null) {
            throw new RowValidationException(column,
                    label + " could not be parsed from '" + raw + "'. Use dd/MM/yyyy.", raw);
        }
        return date;
    }

    public static <E extends Enum<E>> E parseEnum(Class<E> type, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(type, value.trim().toUpperCase().replace(' ', '_').replace('-', '_'));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
