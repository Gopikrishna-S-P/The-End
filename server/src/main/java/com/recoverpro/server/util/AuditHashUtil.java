package com.recoverpro.server.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public final class AuditHashUtil {

    private static final char SEP = ''; // unit separator — stable across serializers
    private static final String NULL_TOKEN = "\\0";

    private AuditHashUtil() {}

    public static String sha256Hex(String canonical) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(canonical.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public static StringBuilder appendField(StringBuilder sb, Object value) {
        sb.append(SEP);
        sb.append(value == null ? NULL_TOKEN : value.toString());
        return sb;
    }

    public static String canonical(String prevHash, Object... fields) {
        StringBuilder sb = new StringBuilder();
        sb.append(prevHash == null ? NULL_TOKEN : prevHash);
        for (Object f : fields) appendField(sb, f);
        return sb.toString();
    }
}
