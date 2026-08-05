package com.recoverpro.server.service.security;

import org.springframework.stereotype.Component;

@Component
public class NoOpGeoIpResolver implements GeoIpResolver {
    @Override
    public String resolveCountry(String ipAddress) {
        return null;
    }
}
