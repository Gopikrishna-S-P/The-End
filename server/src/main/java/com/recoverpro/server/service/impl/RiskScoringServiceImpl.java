package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.BorrowerRiskScoreResponse;
import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.BorrowerRiskScore;
import com.recoverpro.server.enums.AbilityLevel;
import com.recoverpro.server.enums.BorrowerSegment;
import com.recoverpro.server.enums.IntentLevel;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.repository.BorrowerRiskScoreRepository;
import com.recoverpro.server.service.RiskScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RiskScoringServiceImpl implements RiskScoringService {

    private static final String MODEL_VERSION = "rules-v1";

    private final BorrowerRepository borrowerRepository;
    private final BorrowerRiskScoreRepository scoreRepository;

    @Override
    public BorrowerRiskScoreResponse scoreBorrower(UUID borrowerId, UUID callerOrgId) {
        Borrower b = loadAndAssertTenant(borrowerId, callerOrgId);
        return persistScore(b, Map.of());
    }

    @Override
    public BorrowerRiskScoreResponse scoreWithFeatures(UUID borrowerId, Map<String, Object> features, UUID callerOrgId) {
        Borrower b = loadAndAssertTenant(borrowerId, callerOrgId);
        Map<String, Object> safe = features == null ? Map.of() : features;
        validateFeatureRanges(safe);
        return persistScore(b, safe);
    }

    @Override
    @Transactional(readOnly = true)
    public BorrowerRiskScoreResponse getLatest(UUID borrowerId) {
        return scoreRepository.findFirstByBorrowerIdOrderByScoredAtDesc(borrowerId)
                .map(this::toResponse)
                .orElse(null);
    }

    private BorrowerRiskScoreResponse persistScore(Borrower b, Map<String, Object> features) {
        Inference inf = infer(b, features);
        BorrowerRiskScore row = BorrowerRiskScore.builder()
                .organizationId(b.getOrganizationId())
                .borrowerId(b.getId())
                .modelVersion(MODEL_VERSION)
                .defaultPropensity(inf.propensity)
                .intent(inf.intent)
                .ability(inf.ability)
                .segment(inf.segment)
                .featureAttributions(inf.attributions)
                .featureSnapshot(snapshotInputs(b, features))
                .scoredAt(Instant.now())
                .build();
        BorrowerRiskScore saved = scoreRepository.save(row);
        log.info("Risk scored: borrower={}, intent={}, ability={}, segment={}, propensity={}",
                b.getId(), inf.intent, inf.ability, inf.segment, inf.propensity);
        return toResponse(saved);
    }

    private Inference infer(Borrower b, Map<String, Object> features) {
        Map<String, Object> attributions = new LinkedHashMap<>();

        IntentLevel intent = IntentLevel.MEDIUM;
        if (b.isErasurePending()) {
            intent = IntentLevel.LOW;
            attributions.put("erasure_pending", "intent_to_LOW");
        }
        Double keptRate = readDouble(features.get("ptp_kept_rate"));
        if (keptRate != null) {
            if      (keptRate >= 0.66) { intent = IntentLevel.HIGH;   attributions.put("ptp_kept_rate>=0.66", "intent_HIGH"); }
            else if (keptRate >= 0.33) { intent = IntentLevel.MEDIUM; attributions.put("ptp_kept_rate 0.33-0.66", "intent_MEDIUM"); }
            else                       { intent = IntentLevel.LOW;    attributions.put("ptp_kept_rate<0.33", "intent_LOW"); }
        }
        Double contactability = readDouble(features.get("contactability_rate"));
        if (contactability != null && contactability < 0.20 && intent != IntentLevel.LOW) {
            intent = IntentLevel.LOW;
            attributions.put("contactability<0.20", "intent_to_LOW");
        }

        AbilityLevel ability = AbilityLevel.MEDIUM;
        Double otp = readDouble(features.get("outstanding_to_principal_ratio"));
        Boolean npa = readBoolean(features.get("npa_flagged"));
        Double dpd = readDouble(features.get("dpd_days"));

        if (Boolean.TRUE.equals(npa)) {
            ability = AbilityLevel.LOW;
            attributions.put("npa_flagged", "ability_to_LOW");
        }
        if (otp != null) {
            if      (otp <= 0.30) { ability = AbilityLevel.HIGH;   attributions.put("outstanding_ratio<=0.30", "ability_HIGH"); }
            else if (otp <= 0.70) { ability = atMost(ability, AbilityLevel.MEDIUM); attributions.put("outstanding_ratio 0.30-0.70", "ability_<=MEDIUM"); }
            else                   { ability = AbilityLevel.LOW;    attributions.put("outstanding_ratio>0.70", "ability_LOW"); }
        }
        if (dpd != null && dpd > 90) {
            ability = atMost(ability, AbilityLevel.LOW);
            attributions.put("dpd>90", "ability_to_LOW");
        }

        BorrowerSegment segment = matrix(intent, ability);
        BigDecimal propensity = propensityFor(intent, ability);
        return new Inference(intent, ability, segment, propensity, attributions);
    }

    private static BorrowerSegment matrix(IntentLevel intent, AbilityLevel ability) {
        return switch (intent) {
            case HIGH -> switch (ability) {
                case HIGH   -> BorrowerSegment.LIKELY_SELF_CURE;
                case MEDIUM -> BorrowerSegment.COOPERATIVE_CAPABLE;
                case LOW    -> BorrowerSegment.STRETCHED_HONEST;
            };
            case MEDIUM -> switch (ability) {
                case HIGH   -> BorrowerSegment.INERTIAL;
                case MEDIUM -> BorrowerSegment.PERSUADABLE;
                case LOW    -> BorrowerSegment.AT_RISK;
            };
            case LOW -> switch (ability) {
                case HIGH   -> BorrowerSegment.WILFUL_DEFAULT;
                case MEDIUM -> BorrowerSegment.STRATEGIC_DEFAULT;
                case LOW    -> BorrowerSegment.DISTRESSED_HOSTILE;
            };
        };
    }

    private static BigDecimal propensityFor(IntentLevel intent, AbilityLevel ability) {
        double p = switch (intent) {
            case HIGH   -> switch (ability) { case HIGH -> 0.10; case MEDIUM -> 0.20; case LOW -> 0.40; };
            case MEDIUM -> switch (ability) { case HIGH -> 0.25; case MEDIUM -> 0.50; case LOW -> 0.65; };
            case LOW    -> switch (ability) { case HIGH -> 0.55; case MEDIUM -> 0.75; case LOW -> 0.90; };
        };
        return BigDecimal.valueOf(p);
    }

    private static AbilityLevel atMost(AbilityLevel current, AbilityLevel cap) {
        if (current.ordinal() > cap.ordinal()) return cap;
        return current;
    }

    private Map<String, Object> snapshotInputs(Borrower b, Map<String, Object> features) {
        Map<String, Object> snap = new HashMap<>(features);
        snap.put("erasure_pending", b.isErasurePending());
        snap.put("organization_id", b.getOrganizationId());
        return snap;
    }

    private Borrower loadAndAssertTenant(UUID borrowerId, UUID callerOrgId) {
        Borrower b = borrowerRepository.findById(borrowerId)
                .orElseThrow(() -> new ResourceNotFoundException("Borrower not found: " + borrowerId));
        if (callerOrgId != null && !callerOrgId.equals(b.getOrganizationId())) {
            throw new ResourceNotFoundException("Borrower not found: " + borrowerId);
        }
        return b;
    }

    private static void validateFeatureRanges(Map<String, Object> features) {
        checkRate(features, "ptp_kept_rate");
        checkRate(features, "contactability_rate");
        Double otp = readDouble(features.get("outstanding_to_principal_ratio"));
        if (otp != null && otp < 0) {
            throw new BusinessException("Feature out of range: outstanding_to_principal_ratio must be >= 0 (got " + otp + ")");
        }
        Double dpd = readDouble(features.get("dpd_days"));
        if (dpd != null && dpd < 0) {
            throw new BusinessException("Feature out of range: dpd_days must be >= 0 (got " + dpd + ")");
        }
    }

    private static void checkRate(Map<String, Object> features, String key) {
        Double v = readDouble(features.get(key));
        if (v != null && (v < 0.0 || v > 1.0)) {
            throw new BusinessException("Feature out of range: " + key + " must be in [0,1] (got " + v + ")");
        }
    }

    private static Double readDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(o.toString()); } catch (Exception e) { return null; }
    }

    private static Boolean readBoolean(Object o) {
        if (o == null) return null;
        if (o instanceof Boolean b) return b;
        return "true".equalsIgnoreCase(o.toString()) || "yes".equalsIgnoreCase(o.toString());
    }

    private BorrowerRiskScoreResponse toResponse(BorrowerRiskScore s) {
        return BorrowerRiskScoreResponse.builder()
                .id(s.getId())
                .organizationId(s.getOrganizationId())
                .borrowerId(s.getBorrowerId())
                .modelVersion(s.getModelVersion())
                .defaultPropensity(s.getDefaultPropensity())
                .intent(s.getIntent())
                .ability(s.getAbility())
                .segment(s.getSegment())
                .featureAttributions(s.getFeatureAttributions())
                .featureSnapshot(s.getFeatureSnapshot())
                .scoredAt(s.getScoredAt())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private record Inference(
            IntentLevel intent,
            AbilityLevel ability,
            BorrowerSegment segment,
            BigDecimal propensity,
            Map<String, Object> attributions
    ) {}
}
