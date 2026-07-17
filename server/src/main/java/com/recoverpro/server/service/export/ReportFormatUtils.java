package com.recoverpro.server.service.export;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/** Shared cell/label formatting for the Excel and PDF report builders (SYSTEM-PLAN SP40 — split
 * out of the 666-line ExportServiceImpl). */
public final class ReportFormatUtils {

    public static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    public static final DateTimeFormatter DT_FMT  = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(IST);
    public static final DateTimeFormatter MON_FMT = DateTimeFormatter.ofPattern("MMMM yyyy");

    private ReportFormatUtils() {}

    public static String[] kv(String k, String v) { return new String[]{k, v}; }

    public static String str(Object v) { return v == null ? "—" : String.valueOf(v); }

    public static String cur(BigDecimal v) { return v == null ? "—" : "₹" + String.format("%,.2f", v); }

    public static String pct(BigDecimal v) {
        return v == null ? "—" : v.setScale(2, RoundingMode.HALF_UP) + "%";
    }

    public static String fmt(LocalDate d) {
        return d == null ? "—" : d.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
    }

    public static String now() { return DT_FMT.format(Instant.now()); }

    public static String shorten(UUID id) {
        return id == null ? "—" : id.toString().substring(0, 8).toUpperCase();
    }

    public static byte[] hex(String h) {
        h = h.replace("#", "");
        return new byte[]{(byte) Integer.parseInt(h, 0, 2, 16),
                          (byte) Integer.parseInt(h, 2, 4, 16),
                          (byte) Integer.parseInt(h, 4, 6, 16)};
    }
}
