package com.recoverpro.server.repository;

import com.recoverpro.server.dto.request.PtpFilterRequest;
import com.recoverpro.server.entity.PtpNameSearchToken;
import com.recoverpro.server.entity.PtpRecord;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class PtpSpecification {

    private PtpSpecification() {}

    /**
     * SYSTEM-PLAN 26.1: borrowerName used to be matched with {@code cb.like(cb.lower(...), "%"+..+"%")}
     * directly against PtpRecord.borrowerName -- which is AES/GCM ciphertext with a random IV per
     * row (EncryptedStringConverter), so a LIKE against it can never match. It silently returned
     * zero rows instead of erroring. Fixed the same way Allocation's borrower-name search was:
     * PtpSearchIndexService maintains a blind-index child table (ptp_name_search_tokens) of
     * HMAC-SHA256 prefix tokens; the caller (PtpServiceImpl) computes one hash of the search term
     * and passes it in here, since a Specification has no Spring-managed dependencies of its own.
     *
     * <p>This is prefix-per-word matching, not "contains anywhere" -- same accepted trade-off as
     * Allocation's search (see docs/superpowers/specs/2026-08-06-global-search-design.md). Web UI
     * copy for any borrowerName filter that reaches this must say "starts with", not "contains".
     */
    public static Specification<PtpRecord> withFilters(PtpFilterRequest filter, String borrowerNameHash) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isFalse(root.get("isDeleted")));
            if (filter.getAllocationId() != null)
                predicates.add(cb.equal(root.get("allocationId"), filter.getAllocationId()));
            if (filter.getAgentId() != null)
                predicates.add(cb.equal(root.get("agentId"), filter.getAgentId()));
            if (filter.getStatus() != null)
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            if (filter.getPromisedDateFrom() != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("promisedDate"), filter.getPromisedDateFrom()));
            if (filter.getPromisedDateTo() != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("promisedDate"), filter.getPromisedDateTo()));
            if (filter.getLoanNumber() != null && !filter.getLoanNumber().isBlank())
                predicates.add(cb.like(cb.lower(root.get("loanNumber")),
                        "%" + filter.getLoanNumber().toLowerCase() + "%"));
            if (borrowerNameHash != null) {
                Subquery<UUID> tokenMatch = query.subquery(UUID.class);
                var tokenRoot = tokenMatch.from(PtpNameSearchToken.class);
                tokenMatch.select(tokenRoot.get("ptpId"))
                        .where(cb.equal(tokenRoot.get("tokenHash"), borrowerNameHash));
                predicates.add(root.get("id").in(tokenMatch));
            }
            if (filter.getReminderSent() != null)
                predicates.add(cb.equal(root.get("reminderSent"), filter.getReminderSent()));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
