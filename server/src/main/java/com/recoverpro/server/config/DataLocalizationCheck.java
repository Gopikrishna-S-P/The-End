package com.recoverpro.server.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class DataLocalizationCheck {

    @Value("${app.region.expected:}")
    private String expectedRegion;

    @Value("${app.region.enforce:true}")
    private boolean enforce;

    @EventListener(ApplicationReadyEvent.class)
    void verify() {
        if (expectedRegion == null || expectedRegion.isBlank()) {
            log.info("Data-localization check skipped — set app.region.expected (e.g. ap-south-1) in production.");
            return;
        }

        String detected = System.getenv("AWS_REGION");
        if (detected == null || detected.isBlank()) {
            detected = System.getProperty("aws.region", "");
        }

        if (detected == null || detected.isBlank()) {
            String msg = "Data-localization check FAILED: app.region.expected=" + expectedRegion
                    + " but AWS_REGION / aws.region is unset.";
            if (enforce) throw new IllegalStateException(msg);
            log.error(msg);
            return;
        }

        if (!expectedRegion.equalsIgnoreCase(detected)) {
            String msg = "Data-localization check FAILED: expected=" + expectedRegion
                    + " but runtime AWS_REGION=" + detected
                    + ". RBI Storage of Payment System Data 2018 + DPDP §16 require primary stores in India.";
            if (enforce) throw new IllegalStateException(msg);
            log.error(msg);
            return;
        }

        log.info("Data-localization check passed: region={}", detected);
    }
}
