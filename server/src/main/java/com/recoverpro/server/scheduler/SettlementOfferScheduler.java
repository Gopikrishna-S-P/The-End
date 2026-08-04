package com.recoverpro.server.scheduler;

import com.recoverpro.server.service.OpsAlertService;
import com.recoverpro.server.service.SettlementOfferService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SettlementOfferScheduler {

    private final SettlementOfferService settlementOfferService;
    private final OpsAlertService opsAlertService;

    /** Runs nightly at 00:45 — after PtpScheduler's expired-PTP sweep (00:30), same rationale. */
    @Scheduled(cron = "${app.scheduler.settlement-expiry-cron:0 45 0 * * *}", zone = "Asia/Kolkata")
    @SchedulerLock(name = "SettlementOfferScheduler.expireOverdueOffers", lockAtLeastFor = "PT30S", lockAtMostFor = "PT10M")
    public void expireOverdueOffers() {
        log.info("SettlementOfferScheduler: starting expiry sweep");
        try {
            int expired = settlementOfferService.expireOverdueOffers();
            log.info("SettlementOfferScheduler: expiry sweep complete — expired={}", expired);
        } catch (Exception e) {
            log.error("SettlementOfferScheduler: expiry sweep failed", e);
            opsAlertService.alertJobFailure("SettlementOfferScheduler.expireOverdueOffers",
                    "nightly settlement-offer expiry sweep", e);
        }
    }
}
