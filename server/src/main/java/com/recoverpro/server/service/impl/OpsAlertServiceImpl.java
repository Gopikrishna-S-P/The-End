package com.recoverpro.server.service.impl;

import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.OpsAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpsAlertServiceImpl implements OpsAlertService {

    private final EmailService emailService;

    @Value("${app.alerts.cooldown-minutes:30}")
    private long cooldownMinutes;

    // In-memory, per-instance -- a job that fails, alerts, then keeps failing (e.g. a retry
    // loop) shouldn't send one email per attempt. Fine to reset on restart/across instances:
    // worst case is one extra alert, not a missed one.
    private final Map<String, Instant> lastAlertedAt = new ConcurrentHashMap<>();

    @Override
    public void alertJobFailure(String jobName, String context, Throwable cause) {
        Instant now = Instant.now();
        Instant last = lastAlertedAt.get(jobName);
        Duration cooldown = Duration.ofMinutes(cooldownMinutes);
        if (last != null && now.isBefore(last.plus(cooldown))) {
            log.debug("Ops alert for '{}' suppressed (within {}-minute cooldown, last sent {})",
                    jobName, cooldownMinutes, last);
            return;
        }
        lastAlertedAt.put(jobName, now);

        String subject = "Background job failed: " + jobName;
        String body = "Job: " + jobName + "\n"
                + "When: " + now + "\n"
                + "Context: " + context + "\n"
                + "Error: " + (cause != null ? cause.getMessage() : "unknown")
                + "\n\nFull stack trace is in the server log, not repeated here."
                + (cooldownMinutes > 0
                        ? "\n\nFurther failures of this same job are suppressed for "
                                + cooldownMinutes + " minutes to avoid spamming this inbox."
                        : "");
        emailService.sendOpsAlert(subject, body);
    }
}
