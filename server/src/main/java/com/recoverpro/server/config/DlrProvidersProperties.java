package com.recoverpro.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.cadence.dlr")
public class DlrProvidersProperties {

    private boolean strict = true;
    private Map<String, ProviderConfig> providers = new HashMap<>();

    @Data
    public static class ProviderConfig {
        private String secret;
        private String signatureHeader = "X-Provider-Signature";
        private String algorithm = "SHA256";
        private String encoding = "hex";
        private boolean twilioStyleCanonicalize = false;
    }
}
