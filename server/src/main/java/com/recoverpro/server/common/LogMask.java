package com.recoverpro.server.common;

public final class LogMask {

    private LogMask() {}

    public static String email(String value) {
        if (value == null) return null;
        int at = value.indexOf('@');
        if (at <= 0) return value;
        return value.charAt(0) + "****" + value.substring(at);
    }

    public static String phone(String value) {
        if (value == null || value.length() < 4) return value;
        return "****" + value.substring(value.length() - 4);
    }
}
