package com.recoverpro.server.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * ClamAV configuration. Scanning is disabled by default (clamav.enabled=false).
 * Enable in prod with clamav.enabled=true + clamav.host pointing to the daemon.
 */
@Configuration
public class ClamAvConfig {

    @Bean
    @ConditionalOnProperty(name = "clamav.enabled", havingValue = "true")
    public String clamAvEnabledMarker() {
        return "clamav-enabled";
    }
}
