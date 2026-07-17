package com.recoverpro.server.repository;

import com.recoverpro.server.dto.request.PtpFilterRequest;
import com.recoverpro.server.entity.PtpRecord;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class PtpSpecification {

    private PtpSpecification() {}

    public static Specification<PtpRecord> withFilters(PtpFilterRequest filter) {
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
            if (filter.getBorrowerName() != null && !filter.getBorrowerName().isBlank())
                predicates.add(cb.like(cb.lower(root.get("borrowerName")),
                        "%" + filter.getBorrowerName().toLowerCase() + "%"));
            if (filter.getReminderSent() != null)
                predicates.add(cb.equal(root.get("reminderSent"), filter.getReminderSent()));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
