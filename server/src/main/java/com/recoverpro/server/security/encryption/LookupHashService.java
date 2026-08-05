package com.recoverpro.server.security.encryption;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Slf4j
@Service
public class LookupHashService {

    private static volatile LookupHashService INSTANCE;

    @Value("${app.encryption.lookup-hash-key:}")
    private String configuredKeyBase64;

    @Value("${app.encryption.key-base64:}")
    private String mainKeyBase64;

    private byte[] hmacKey;

    @PostConstruct
    void init() {
        if (configuredKeyBase64 != null && !configuredKeyBase64.isBlank()) {
            this.hmacKey = Base64.getDecoder().decode(configuredKeyBase64.trim());
            log.info("LookupHashService initialised with dedicated lookup key.");
        } else if (mainKeyBase64 != null && !mainKeyBase64.isBlank()) {
            this.hmacKey = derive(Base64.getDecoder().decode(mainKeyBase64.trim()));
            log.warn("LookupHashService deriving HMAC key from main encryption key. "
                    + "Set app.encryption.lookup-hash-key to a separate key in production.");
        } else {
            this.hmacKey = null;
            log.warn("LookupHashService disabled — no encryption keys configured.");
        }
        INSTANCE = this;
    }

    public static LookupHashService get() { return INSTANCE; }

    public String hash(String value) {
        if (value == null || value.isBlank() || hmacKey == null) return null;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacKey, "HmacSHA256"));
            byte[] digest = mac.doFinal(value.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new EncryptionException("HMAC failure in LookupHashService", e);
        }
    }

    public String hashPhone(String phone) {
        if (phone == null) return null;
        return hash(phone.replaceAll("\\D+", ""));
    }

    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return a == b;
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }

    private static byte[] derive(byte[] mainKey) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(mainKey, "HmacSHA256"));
            return mac.doFinal("recoverpro:lookup".getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new EncryptionException("Failed to derive lookup-hash key", e);
        }
    }

    @Component
    static class StaticPublisher {
        StaticPublisher(LookupHashService svc) { INSTANCE = svc; }
    }
}
