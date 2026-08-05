package com.recoverpro.server.security.encryption;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

/**
 * Field-level PII encryption (EncryptedStringConverter on Borrower, User.mfaSecret,
 * etc.) is entirely inert whenever EncryptionContext.envelopeEncryptor() resolves to
 * DisabledEnvelopeEncryptor. Confirms the safe defaults: enabled by default, and a
 * missing local key fails startup rather than silently encrypting with a throwaway
 * ephemeral key that can't survive a restart.
 */
class EncryptionContextTest {

    @Test
    void enabledWithNoLocalKeyConfigured_refusesToStartRatherThanUseEphemeralKey() {
        EncryptionContext context = newContext(true, "local", "");
        assertThatExceptionOfType(EncryptionException.class)
                .isThrownBy(context::envelopeEncryptor)
                .withMessageContaining("app.encryption.key-base64");
    }

    @Test
    void enabledWithValidLocalKey_returnsWorkingEncryptor() {
        String key = Base64.getEncoder().encodeToString(new byte[32]);
        EncryptionContext context = newContext(true, "local", key);
        EnvelopeEncryptor encryptor = context.envelopeEncryptor();

        assertThat(encryptor).isInstanceOf(LocalKeyEnvelopeEncryptor.class);
        String ciphertext = encryptor.encrypt("secret-value");
        assertThat(ciphertext).startsWith("enc:v1:").isNotEqualTo("secret-value");
        assertThat(encryptor.decrypt(ciphertext)).isEqualTo("secret-value");
    }

    @Test
    void disabled_returnsPassthroughEncryptor() {
        EncryptionContext context = newContext(false, "local", "");
        assertThat(context.envelopeEncryptor()).isInstanceOf(DisabledEnvelopeEncryptor.class);
    }

    private static EncryptionContext newContext(boolean enabled, String provider, String keyBase64) {
        EncryptionContext context = new EncryptionContext();
        ReflectionTestUtils.setField(context, "enabled", enabled);
        ReflectionTestUtils.setField(context, "provider", provider);
        ReflectionTestUtils.setField(context, "keyBase64", keyBase64);
        return context;
    }
}
