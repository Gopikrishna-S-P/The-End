package com.recoverpro.server.security.jwt;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

class JwtTokenProviderSecretValidationTest {

    private static final String STRONG_SECRET = "a".repeat(32);

    @Test
    void emptySecret_refusesToStart() {
        assertThatIllegalStateException()
                .isThrownBy(() -> new JwtTokenProvider("", 900000))
                .withMessageContaining("app.jwt.secret");
    }

    @Test
    void unsetSecret_refusesToStart() {
        assertThatIllegalStateException()
                .isThrownBy(() -> new JwtTokenProvider(null, 900000))
                .withMessageContaining("app.jwt.secret");
    }

    @Test
    void secretShorterThan256Bits_refusesToStart() {
        String tooShort = "a".repeat(31); // 31 bytes = 248 bits < 256
        assertThatIllegalStateException()
                .isThrownBy(() -> new JwtTokenProvider(tooShort, 900000))
                .withMessageContaining("256");
    }

    @Test
    void knownPlaceholderSecret_refusesToStart() {
        assertThatIllegalStateException()
                .isThrownBy(() -> new JwtTokenProvider("change-me-in-production-min-256-bits", 900000));
    }

    @Test
    void strongSecret_constructsCleanly() {
        assertThatCode(() -> new JwtTokenProvider(STRONG_SECRET, 900000)).doesNotThrowAnyException();
    }
}
