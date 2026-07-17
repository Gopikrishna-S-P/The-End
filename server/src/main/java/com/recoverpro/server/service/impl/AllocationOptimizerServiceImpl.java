package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.OptimizeAssignmentOrderRequest;
import com.recoverpro.server.dto.response.OptimizedAssignmentOrderResponse;
import com.recoverpro.server.dto.response.OptimizedAssignmentOrderResponse.OrderedAllocation;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.BorrowerRiskScore;
import com.recoverpro.server.entity.RoutePlan;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.BorrowerRiskScoreRepository;
import com.recoverpro.server.repository.RoutePlanRepository;
import com.recoverpro.server.service.AllocationOptimizerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * v1 deterministic optimizer.
 *
 * Composite score per allocation, weights configurable later:
 *   0.50 * default_propensity (latest BorrowerRiskScore, 0 if none)
 *   0.30 * outstanding-rank (within the shortlist; max=1.0)
 *   0.20 * npa_flag (1.0 if true, else 0)
 *
 * Visit order = score descending. Ties broken by outstanding amount desc.
 *
 * NOT consumed (fairness bounds): caste, religion, gender, raw address,
 * raw phone, social/device-graph signals.
 *
 * A real model swap-in changes the {@link #score} method only.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AllocationOptimizerServiceImpl implements AllocationOptimizerService {

    private static final String MODEL_VERSION = "rules-v1";

    private final AllocationRepository allocationRepository;
    private final BorrowerRiskScoreRepository riskScoreRepository;
    private final RoutePlanRepository routePlanRepository;

    @Override
    public OptimizedAssignmentOrderResponse optimize(OptimizeAssignmentOrderRequest request) {
        List<Allocation> allocs = allocationRepository.findAllById(request.getAllocationIds())
                .stream()
                .filter(a -> Boolean.FALSE.equals(a.getIsDeleted()))
                .toList();

        if (allocs.isEmpty()) {
            return OptimizedAssignmentOrderResponse.builder()
                    .organizationId(request.getOrganizationId())
                    .agentId(request.getAgentId())
                    .modelVersion(MODEL_VERSION)
                    .ordered(List.of())
                    .build();
        }

        // Pre-compute outstanding-rank: rescale outstanding_amount onto [0, 1].
        BigDecimal maxOutstanding = allocs.stream()
                .map(a -> a.getOutstandingAmount() == null ? BigDecimal.ZERO : a.getOutstandingAmount())
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);

        // Pre-fetch latest risk score per borrower (one query per distinct borrower).
        Map<UUID, BorrowerRiskScore> latestScoreByBorrower = new HashMap<>();
        allocs.stream()
                .map(Allocation::getBorrowerId)
                .filter(Objects::nonNull)
                .distinct()
                .forEach(bid -> riskScoreRepository
                        .findFirstByBorrowerIdOrderByScoredAtDesc(bid)
                        .ifPresent(rs -> latestScoreByBorrower.put(bid, rs)));

        record Scored(Allocation a, BigDecimal score, String rationale, String segment) {}

        List<Scored> scored = new ArrayList<>(allocs.size());
        for (Allocation a : allocs) {
            BorrowerRiskScore rs = a.getBorrowerId() == null
                    ? null
                    : latestScoreByBorrower.get(a.getBorrowerId());
            String segment = rs == null ? null : rs.getSegment().name();
            BigDecimal score = score(a, rs, maxOutstanding);
            String rationale = explain(a, rs, maxOutstanding);
            scored.add(new Scored(a, score, rationale, segment));
        }

        scored.sort(
                Comparator
                        .comparing((Scored s) -> s.score(), Comparator.reverseOrder())
                        .thenComparing(
                                s -> Optional.ofNullable(s.a().getOutstandingAmount()).orElse(BigDecimal.ZERO),
                                Comparator.reverseOrder()
                        )
        );

        List<OrderedAllocation> ordered = new ArrayList<>(scored.size());
        for (int i = 0; i < scored.size(); i++) {
            Scored s = scored.get(i);
            ordered.add(OrderedAllocation.builder()
                    .allocationId(s.a().getId())
                    .sequenceOrder(i + 1)
                    .score(s.score())
                    .rationale(s.rationale())
                    .segment(s.segment())
                    .build());
        }

        log.info("Optimized {} allocations for agent={} org={}",
                ordered.size(), request.getAgentId(), request.getOrganizationId());

        // Persist a RoutePlan row so the mobile client can fetch the day's
        // queue in one round-trip instead of re-running the optimizer.
        // Best-effort: failure is logged but doesn't fail the optimize call.
        if (request.getAgentId() != null && !ordered.isEmpty()) {
            try {
                upsertRoutePlan(request.getAgentId(), request.getOrganizationId(), ordered);
            } catch (Exception e) {
                log.warn("RoutePlan upsert failed for agent {}: {}",
                        request.getAgentId(), e.getMessage());
            }
        }

        return OptimizedAssignmentOrderResponse.builder()
                .organizationId(request.getOrganizationId())
                .agentId(request.getAgentId())
                .modelVersion(MODEL_VERSION)
                .ordered(ordered)
                .build();
    }

    /**
     * Idempotent upsert of today's RoutePlan for the agent. Score column
     * is the average of the per-allocation scores -- convenient single
     * number for ranking re-optimization runs.
     */
    @Transactional
    public void upsertRoutePlan(UUID agentId, UUID organizationId, List<OrderedAllocation> ordered) {
        LocalDate today = LocalDate.now();
        BigDecimal avgScore = ordered.isEmpty() ? BigDecimal.ZERO :
                ordered.stream()
                        .map(OrderedAllocation::getScore)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(ordered.size()), 4, RoundingMode.HALF_UP);
        List<UUID> ids = ordered.stream().map(OrderedAllocation::getAllocationId).toList();

        RoutePlan plan = routePlanRepository
                .findByAgentIdAndPlanDate(agentId, today)
                .orElseGet(() -> RoutePlan.builder()
                        .agentId(agentId)
                        .organizationId(organizationId)
                        .planDate(today)
                        .build());
        plan.setOrganizationId(organizationId);
        plan.setAssignmentIds(ids);
        plan.setScore(avgScore);
        routePlanRepository.save(plan);
    }

    // -------------------------------------------------------------------

    private BigDecimal score(Allocation a, BorrowerRiskScore rs, BigDecimal maxOutstanding) {
        BigDecimal propensity = rs == null ? BigDecimal.ZERO : rs.getDefaultPropensity();
        BigDecimal outstandingRank = outstandingRank(a, maxOutstanding);
        BigDecimal npa = Boolean.TRUE.equals(a.getNpaFlagged()) ? BigDecimal.ONE : BigDecimal.ZERO;

        return propensity.multiply(BigDecimal.valueOf(0.50))
                .add(outstandingRank.multiply(BigDecimal.valueOf(0.30)))
                .add(npa.multiply(BigDecimal.valueOf(0.20)))
                .setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal outstandingRank(Allocation a, BigDecimal maxOutstanding) {
        BigDecimal v = a.getOutstandingAmount() == null ? BigDecimal.ZERO : a.getOutstandingAmount();
        if (maxOutstanding.compareTo(BigDecimal.ZERO) <= 0) return BigDecimal.ZERO;
        return v.divide(maxOutstanding, 4, RoundingMode.HALF_UP);
    }

    private String explain(Allocation a, BorrowerRiskScore rs, BigDecimal maxOutstanding) {
        StringBuilder sb = new StringBuilder();
        if (rs != null) {
            sb.append("propensity=").append(rs.getDefaultPropensity())
                    .append(" (").append(rs.getSegment()).append(")");
        } else {
            sb.append("no risk score on file");
        }
        BigDecimal r = outstandingRank(a, maxOutstanding);
        sb.append("; outstanding-rank=").append(r);
        if (Boolean.TRUE.equals(a.getNpaFlagged())) {
            sb.append("; NPA");
        }
        return sb.toString();
    }
}
