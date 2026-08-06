package com.recoverpro.server.config;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.AllocationSearchIndexService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * One-time maintenance run, NOT part of normal startup: computes
 * allocation_name_search_tokens rows for every allocation that predates this
 * feature. Disabled unless app.backfill.allocation-name-tokens=true is passed
 * explicitly for one run, so it never re-runs on ordinary boots once done.
 * Mirrors LookupHashBackfillRunner's shape exactly.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class AllocationNameTokenBackfillRunner implements CommandLineRunner {

    private static final int PAGE_SIZE = 200;

    @Value("${app.backfill.allocation-name-tokens:false}")
    private boolean enabled;

    private final OrganizationRepository organizationRepository;
    private final AllocationRepository allocationRepository;
    private final AllocationSearchIndexService allocationSearchIndexService;

    @Override
    public void run(String... args) {
        if (!enabled) return;

        log.warn("Allocation name-token backfill starting.");
        List<Organization> orgs = organizationRepository.findAll();
        int totalAllocations = 0;
        int totalOrgs = 0;

        for (Organization org : orgs) {
            RlsOrgIdHolder.set(org.getId());
            try {
                totalAllocations += backfillOrg(org.getId());
            } catch (Exception e) {
                log.error("Allocation name-token backfill failed for orgId={}: {}", org.getId(), e.getMessage(), e);
            } finally {
                RlsOrgIdHolder.clear();
            }
            totalOrgs++;
        }

        log.warn("Allocation name-token backfill complete: {} allocations recomputed across {} organizations.",
                totalAllocations, totalOrgs);
    }

    @Transactional
    protected int backfillOrg(UUID orgId) {
        int updated = 0;
        int page = 0;
        Slice<Allocation> slice;
        do {
            slice = allocationRepository.findAllByOrganizationIdPaged(orgId, PageRequest.of(page, PAGE_SIZE));
            for (Allocation allocation : slice.getContent()) {
                allocationSearchIndexService.reindex(allocation);
                updated++;
            }
            page++;
        } while (slice.hasNext());
        return updated;
    }
}
