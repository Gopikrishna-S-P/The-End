package com.recoverpro.server.service.tax;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GstinTest {

    @Test
    void isValid_wellFormedGstin_returnsTrue() {
        assertThat(Gstin.isValid("27AAAPL1234C1Z5")).isTrue();
    }

    @Test
    void isValid_wrongLength_returnsFalse() {
        assertThat(Gstin.isValid("27AAAPL1234C1Z")).isFalse();
        assertThat(Gstin.isValid("27AAAPL1234C1Z55")).isFalse();
    }

    @Test
    void isValid_lowercase_returnsFalse() {
        assertThat(Gstin.isValid("27aaapl1234c1z5")).isFalse();
    }

    @Test
    void isValid_null_returnsFalse() {
        assertThat(Gstin.isValid(null)).isFalse();
    }

    @Test
    void isValid_missingLiteralZ_returnsFalse() {
        // position 14 (0-indexed 13) must be the literal 'Z'
        assertThat(Gstin.isValid("27AAAPL1234C1A5")).isFalse();
    }

    @Test
    void stateCode_validGstin_returnsFirstTwoChars() {
        assertThat(Gstin.stateCode("27AAAPL1234C1Z5")).isEqualTo("27");
        assertThat(Gstin.stateCode("07AAAPL1234C1Z5")).isEqualTo("07");
    }

    @Test
    void stateCode_invalidGstin_throws() {
        assertThatThrownBy(() -> Gstin.stateCode("not-a-gstin"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
