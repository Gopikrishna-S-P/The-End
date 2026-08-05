package com.recoverpro.server.security.encryption;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.kms.KmsClientBuilder;
import software.amazon.awssdk.services.kms.model.DecryptRequest;
import software.amazon.awssdk.services.kms.model.EncryptRequest;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
public class KmsEnvelopeEncryptor implements EnvelopeEncryptor {

    static final String KMS_PREFIX = "enc:kms:";

    private final KmsClient kmsClient;
    private final String keyId;

    public KmsEnvelopeEncryptor(String region, String keyId) {
        if (keyId == null || keyId.isBlank()) {
            throw new EncryptionException("KMS key id / ARN is required");
        }
        this.keyId = keyId;
        KmsClientBuilder builder = KmsClient.builder();
        if (region != null && !region.isBlank()) builder = builder.region(Region.of(region));
        this.kmsClient = builder.build();
        log.info("KmsEnvelopeEncryptor active. region={} key={}", region, keyId);
    }

    @Override
    public String encrypt(String plaintext) {
        if (plaintext == null) return null;
        try {
            byte[] ct = kmsClient.encrypt(EncryptRequest.builder()
                    .keyId(keyId)
                    .plaintext(SdkBytes.fromUtf8String(plaintext))
                    .build()).ciphertextBlob().asByteArray();
            return KMS_PREFIX + Base64.getEncoder().encodeToString(ct);
        } catch (Exception e) {
            throw new EncryptionException("KMS encrypt failed", e);
        }
    }

    @Override
    public String decrypt(String storedValue) {
        if (storedValue == null) return null;
        if (!storedValue.startsWith(KMS_PREFIX)) return storedValue;
        try {
            byte[] blob = Base64.getDecoder().decode(storedValue.substring(KMS_PREFIX.length()));
            byte[] pt = kmsClient.decrypt(DecryptRequest.builder()
                    .ciphertextBlob(SdkBytes.fromByteArray(blob))
                    .build()).plaintext().asByteArray();
            return new String(pt, StandardCharsets.UTF_8);
        } catch (EncryptionException e) {
            throw e;
        } catch (Exception e) {
            throw new EncryptionException("KMS decrypt failed (key mismatch or tampering?)", e);
        }
    }
}
