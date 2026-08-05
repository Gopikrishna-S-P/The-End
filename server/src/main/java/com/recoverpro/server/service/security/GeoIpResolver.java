package com.recoverpro.server.service.security;

public interface GeoIpResolver {
    /** Returns the ISO-3166-1 alpha-2 country code for the given IP, or null if unknown. */
    String resolveCountry(String ipAddress);
}
