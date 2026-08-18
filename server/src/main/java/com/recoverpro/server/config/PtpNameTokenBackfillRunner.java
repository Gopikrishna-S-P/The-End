package com.recoverpro.server.config;

import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.PtpRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.PtpSearchIndexService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * SYSTEM-PLAN 26.1: one-time maintenance run, NOT part of normal startup -- computes
 * ptp_name_search_tokens rows for every PtpRecord that predates this feature. Disabled unless
 * app.backfill.ptp-name-tokens=true is passed explicitly for one run, so it never re-runs on
 * ordinary boots once done. Mirrors AllocationNameTokenBackfillRunner's shape exactly.
 */
@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
public class PtpNameTokenBackfillRunner implements CommandLineRunner {

    private static final int PAGE_SIZE = 200;

    @Value("${app.backfill.ptp-name-tokens:false}")
    private boolean enabled;

    private final OrganizationRepository organizationRepository;
    private final PtpRepository ptpRepository;
    private final PtpSearchIndexService ptpSearchIndexService;

    @Override
    public void run(String... args) {
        if (!enabled) return;

        log.warn("PTP name-token backfill starting.");
        List<Organization> orgs = organizationRepository.findAll();
        int totalPtps = 0;
        int totalOrgs = 0;

        for (Organization org : orgs) {
            RlsOrgIdHolder.set(org.getId());
            try {
                totalPtps += backfillOrg(org.getId());
            } catch (Exception e) {
                log.error("PTP name-token backfill failed for orgId={}: {}", org.getId(), e.getMessage(), e);
            } finally {
                RlsOrgIdHolder.clear();
            }
            totalOrgs++;
        }

        log.warn("PTP name-token backfill complete: {} PTPs recomputed across {} organizations.",
                totalPtps, totalOrgs);
    }

    @Transactional
    protected int backfillOrg(UUID orgId) {
        int updated = 0;
        int page = 0;
        Page<PtpRecord> slice;
        do {
            slice = ptpRepository.findAllByOrganizationIdPaged(orgId, PageRequest.of(page, PAGE_SIZE));
            for (PtpRecord ptp : slice.getContent()) {
                ptpSearchIndexService.reindex(ptp, orgId);
                updated++;
            }
            page++;
        } while (slice.hasNext());
        return updated;
    }
}
