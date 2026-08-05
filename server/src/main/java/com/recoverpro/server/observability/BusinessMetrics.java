package com.recoverpro.server.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class BusinessMetrics {

    private static final String STATUS_TAG = "status";

    private final MeterRegistry registry;
    private final Counter refreshSuccess;
    private final Counter tokenTheftDetected;

    public BusinessMetrics(MeterRegistry registry) {
        this.registry = registry;
        this.refreshSuccess = Counter.builder("auth.refresh.success")
                .description("Refresh-token rotations that produced a new access token.")
                .register(registry);
        this.tokenTheftDetected = Counter.builder("auth.refresh.theft_detected")
                .description("Refresh-token reuse detected — every increment is a revoked session family.")
                .register(registry);
    }

    public void recordRefreshSuccess() {
        refreshSuccess.increment();
    }

    public void recordTokenTheftDetected() {
        tokenTheftDetected.increment();
    }

    public void recordCollectionSubmitted(String status) {
        Counter.builder("collection.submitted")
                .description("Collection records created, tagged by status.")
                .tag(STATUS_TAG, normalise(status))
                .register(registry)
                .increment();
    }

    private static String normalise(String raw) {
        if (raw == null || raw.isBlank()) return "unknown";
        return raw.toLowerCase(Locale.ROOT);
    }
}
