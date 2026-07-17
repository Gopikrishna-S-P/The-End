package com.recoverpro.server.scheduler;

import com.recoverpro.server.service.CallingHoursGuard;
import com.recoverpro.server.service.PtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class PtpScheduler {

    private final PtpService ptpService;
    private final CallingHoursGuard callingHoursGuard;

    /**
     * Nightly job - runs at 00:30 every day. Internal status mutation only,
     * no outbound communication, so the calling-hours guard does NOT apply.
     */
    @Scheduled(cron = "0 30 0 * * *", zone = "Asia/Kolkata")
    @SchedulerLock(name = "PtpScheduler.markExpiredPtpsAsBroken", lockAtLeastFor = "PT30S", lockAtMostFor = "PT10M")
    public void markExpiredPtpsAsBroken() {
        log.info("PtpScheduler: Starting nightly expired-PTP job");
        long t0 = System.currentTimeMillis();
        try {
            int flipped = ptpService.autoMarkExpiredPtpsAsBroken();
            // A silent 0-row run (filter bug, data drift) used to look
            // identical to a healthy run with no work to do. Logging the
            // count lets an SRE chart "flipped" over time and notice the
            // shape change before borrowers do.
            log.info("PtpScheduler: Nightly expired-PTP job completed — flipped={} elapsedMs={}",
                    flipped, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            log.error("PtpScheduler: Nightly expired-PTP job failed after {}ms",
                    System.currentTimeMillis() - t0, e);
        }
    }

    /**
     * Morning reminder job - runs at 08:00 every day.
     * Sends due-date reminders to agents for PTPs due tomorrow.
     *
     * Gated by CallingHoursGuard (design-doc Section 9.5 / Phase A item a2 -
     * RBI Recovery Agent Code of Conduct). If the cron is ever reconfigured
     * outside 08:00-19:00 IST or onto Sunday, the guard short-circuits the
     * dispatch and logs the reason rather than emitting outbound comms.
     * Per-organization holiday checks happen inside PtpService when iterating
     * borrowers, since this scheduler tick is system-wide.
     */
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Kolkata")
    @SchedulerLock(name = "PtpScheduler.sendDueDateReminders", lockAtLeastFor = "PT30S", lockAtMostFor = "PT10M")
    public void sendDueDateReminders() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
        if (!callingHoursGuard.isAllowedNow()) {
            log.warn("PtpScheduler: Skipping reminder job - outside calling hours ({})",
                    callingHoursGuard.denialReason(null, now));
            return;
        }
        log.info("PtpScheduler: Starting morning reminder job");
        long t0 = System.currentTimeMillis();
        try {
            int sent = ptpService.sendDueDateReminders();
            log.info("PtpScheduler: Morning reminder job completed — sent={} elapsedMs={}",
                    sent, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            log.error("PtpScheduler: Morning reminder job failed after {}ms",
                    System.currentTimeMillis() - t0, e);
        }
    }
}
