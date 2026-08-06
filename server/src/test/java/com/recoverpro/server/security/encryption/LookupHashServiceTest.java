package com.recoverpro.server.security.encryption;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class LookupHashServiceTest {

    @Autowired
    private LookupHashService lookupHashService;

    @Test
    void nameSearchTokens_returnsPrefixesOfEachWord() {
        Set<String> tokens = lookupHashService.nameSearchTokens("John Smith");

        assertThat(tokens).contains(
                lookupHashService.hash("jo"), lookupHashService.hash("joh"), lookupHashService.hash("john"),
                lookupHashService.hash("sm"), lookupHashService.hash("smi"), lookupHashService.hash("smit"), lookupHashService.hash("smith"));
        assertThat(tokens).hasSize(7);
    }

    @Test
    void nameSearchTokens_isCaseAndWhitespaceInsensitive() {
        Set<String> lower = lookupHashService.nameSearchTokens("john smith");
        Set<String> mixed = lookupHashService.nameSearchTokens("  John   SMITH  ");

        assertThat(mixed).isEqualTo(lower);
    }

    @Test
    void nameSearchTokens_blankOrNull_returnsEmptySet() {
        assertThat(lookupHashService.nameSearchTokens(null)).isEmpty();
        assertThat(lookupHashService.nameSearchTokens("   ")).isEmpty();
    }
}
