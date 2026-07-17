package com.recoverpro.server.security.encryption;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import java.util.Base64;

@Slf4j
@Configuration
public class EncryptionContext {

    private static volatile EnvelopeEncryptor INSTANCE;

    @Value("${app.encryption.enabled:true}")
    private boolean enabled;

    @Value("${app.encryption.provider:local}")
    private String provider;

    @Value("${app.encryption.key-base64:}")
    private String keyBase64;

    @Value("${app.encryption.kms.region:}")
    private String kmsRegion;

    @Value("${app.encryption.kms.key-id:}")
    private String kmsKeyId;

    @Bean
    public EnvelopeEncryptor envelopeEncryptor() {
        if (!enabled) {
            log.warn("PII encryption DISABLED (app.encryption.enabled=false). Set true in production.");
            return new DisabledEnvelopeEncryptor();
        }

        String p = provider == null ? "local" : provider.trim().toLowerCase();

        if ("kms".equals(p)) {
            if (kmsKeyId == null || kmsKeyId.isBlank()) {
                throw new EncryptionException(
                        "app.encryption.provider=kms but app.encryption.kms.key-id is empty");
            }
            log.info("PII encryption ENABLED via AWS KMS.");
            return new KmsEnvelopeEncryptor(kmsRegion, kmsKeyId);
        }

        if (!"local".equals(p)) {
            throw new EncryptionException(
                    "Unknown app.encryption.provider='" + provider + "' (use 'local' or 'kms')");
        }

        if (keyBase64 == null || keyBase64.isBlank()) {
            throw new EncryptionException(
                    "app.encryption.enabled=true (provider=local) but app.encryption.key-base64 is empty. "
                            + "Refusing to start: an auto-generated ephemeral key would make encrypted data "
                            + "unreadable after every restart.");
        }
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(keyBase64.trim());
        } catch (IllegalArgumentException e) {
            throw new EncryptionException("app.encryption.key-base64 is not valid base64", e);
        }
        log.info("PII encryption ENABLED with AES-256-GCM.");
        return new LocalKeyEnvelopeEncryptor(keyBytes);
    }

    public static EnvelopeEncryptor encryptor() {
        EnvelopeEncryptor i = INSTANCE;
        if (i == null) {
            throw new EncryptionException(
                    "EncryptionContext not initialized — accessed before Spring context is ready.");
        }
        return i;
    }

    @Component
    static class StaticPublisher {
        StaticPublisher(EnvelopeEncryptor encryptor) {
            INSTANCE = encryptor;
        }
    }
}
