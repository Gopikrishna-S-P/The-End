package com.recoverpro.server.client;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SEC-PLAN S16: confirms the scanner fails closed (rejects) when it can't
 * reach ClamAV, rather than treating an unreachable scanner as "clean".
 */
class ClamAvScannerClientTest {

    @Test
    void scannerUnreachable_isNotClean() {
        ClamAvScannerClient client = new ClamAvScannerClient();
        ReflectionTestUtils.setField(client, "enabled", true);
        ReflectionTestUtils.setField(client, "host", "127.0.0.1");
        ReflectionTestUtils.setField(client, "port", 1); // nothing listens here
        ReflectionTestUtils.setField(client, "timeoutMs", 500);

        InputStream content = new ByteArrayInputStream("hello".getBytes());

        assertThat(client.isClean(content))
                .as("a scanner that can't be reached must fail closed (treated as infected), not open")
                .isFalse();
    }

    @Test
    void scanningDisabled_treatsFileAsCleanWithoutAttemptingConnection() {
        ClamAvScannerClient client = new ClamAvScannerClient();
        ReflectionTestUtils.setField(client, "enabled", false);
        ReflectionTestUtils.setField(client, "host", "127.0.0.1");
        ReflectionTestUtils.setField(client, "port", 1);

        InputStream content = new ByteArrayInputStream("hello".getBytes());

        assertThat(client.isClean(content)).isTrue();
    }
}
