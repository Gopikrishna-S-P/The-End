package com.recoverpro.server.config;

import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.encryption.LookupHashService;
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

/**
 * One-time maintenance run, NOT part of normal startup: recomputes every borrower's
 * phone/email/ckycId lookup hashes (Borrower#syncLookupHashes) after rotating
 * app.encryption.lookup-hash-key onto its own dedicated key, since every hash already
 * stored was computed under the old key (derived from the main encryption key) and
 * would otherwise silently stop matching -- breaking duplicate-borrower detection for
 * every pre-existing borrower.
 *
 * <p>Disabled unless app.backfill.lookup-hash=true is passed explicitly for one run
 * (e.g. a single `mvn spring-boot:run -Dspring-boot.run.arguments=--app.backfill.lookup-hash=true`),
 * so it never re-runs on ordinary boots once the rotation is done.
 *
 * <p>Loops per-organization and scopes RlsOrgIdHolder to each org in turn rather than
 * using PlatformAdminAccessGuard's cross-org bypass -- that guard exists to attribute
 * a human platform admin's cross-tenant *reads*; this is a headless maintenance job
 * that never holds more than one org's data in scope at a time, so no bypass/audit
 * entry is needed, only the same per-org RLS context any org-scoped request would set.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class LookupHashBackfillRunner implements CommandLineRunner {

    private static final int PAGE_SIZE = 200;

    @Value("${app.backfill.lookup-hash:false}")
    private boolean enabled;

    private final OrganizationRepository organizationRepository;
    private final BorrowerRepository borrowerRepository;
    private final LookupHashService lookupHashService;

    @Override
    public void run(String... args) {
        if (!enabled) return;

        log.warn("LookupHash backfill starting -- recomputing borrower phone/email/ckycId lookup hashes under the current key.");
        List<Organization> orgs = organizationRepository.findAll();
        int totalBorrowers = 0;
        int totalOrgs = 0;

        for (Organization org : orgs) {
            RlsOrgIdHolder.set(org.getId());
            try {
                totalBorrowers += backfillOrg(org.getId());
            } catch (Exception e) {
                log.error("LookupHash backfill failed for orgId={}: {}", org.getId(), e.getMessage(), e);
            } finally {
                RlsOrgIdHolder.clear();
            }
            totalOrgs++;
        }

        log.warn("LookupHash backfill complete: {} borrowers recomputed across {} organizations.", totalBorrowers, totalOrgs);
    }

    @Transactional
    protected int backfillOrg(java.util.UUID orgId) {
        int updated = 0;
        int page = 0;
        Slice<Borrower> slice;
        do {
            slice = borrowerRepository.findByOrganizationId(orgId, PageRequest.of(page, PAGE_SIZE));
            for (Borrower borrower : slice.getContent()) {
                borrower.setPhoneLookupHash(lookupHashService.hashPhone(borrower.getPhone()));
                borrower.setEmailLookupHash(lookupHashService.hash(borrower.getEmail()));
                borrower.setCkycIdLookupHash(lookupHashService.hash(borrower.getCkycId()));
                borrowerRepository.save(borrower);
                updated++;
            }
            page++;
        } while (slice.hasNext());
        return updated;
    }
}
