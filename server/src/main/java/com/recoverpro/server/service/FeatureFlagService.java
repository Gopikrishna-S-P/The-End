package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.config.PlanFeatureMatrix;
import com.recoverpro.server.entity.FeatureFlag;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.repository.FeatureFlagRepository;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeatureFlagService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(5);
    private static final String KEY_PREFIX  = "recoverpro:flag:";

    private static final Set<String> PROTECTED_COMPLIANCE_FLAGS = Set.of(
            "calling_hours_enabled",
            "audit_chain_enabled",
            "kyc_verification_enabled",
            "rbi_reporting_enabled",
            "dpdp_erasure_enabled"
    );

    private final FeatureFlagRepository repository;
    private final StringRedisTemplate redis;
    private final UserActionAuditService auditLogService;
    private final OrgSubscriptionRepository orgSubscriptionRepository;

    public boolean isEnabled(UUID organizationId, String flagKey, boolean defaultIfMissing) {
        if (flagKey == null || flagKey.isBlank()) return defaultIfMissing;
        Boolean cached = readCached(organizationId, flagKey);
        if (cached != null) return cached;
        boolean resolved = resolveFromDb(organizationId, flagKey, defaultIfMissing);
        writeCached(organizationId, flagKey, resolved);
        return resolved;
    }

    @Transactional
    public FeatureFlag set(UUID organizationId, String flagKey, boolean enabled,
                           String description, UUID actingUserId) {
        return set(organizationId, flagKey, enabled, description, actingUserId, FeatureFlag.FlagSource.MANUAL);
    }

    @Transactional
    public FeatureFlag set(UUID organizationId, String flagKey, boolean enabled,
                           String description, UUID actingUserId, FeatureFlag.FlagSource source) {
        if (!enabled && PROTECTED_COMPLIANCE_FLAGS.contains(flagKey)) {
            throw new BusinessException(
                    "Feature flag '" + flagKey + "' is a protected compliance control and cannot be disabled.");
        }
        FeatureFlag flag = (organizationId == null
                ? repository.findGlobalByFlagKey(flagKey)
                : repository.findByOrganizationIdAndFlagKey(organizationId, flagKey))
                .orElseGet(() -> FeatureFlag.builder()
                        .organizationId(organizationId)
                        .flagKey(flagKey)
                        .build());
        boolean before = Boolean.TRUE.equals(flag.getEnabled());
        flag.setEnabled(enabled);
        flag.setDescription(description);
        flag.setUpdatedByUserId(actingUserId);
        flag.setSource(source);
        FeatureFlag saved = repository.save(flag);
        evictCache(organizationId, flagKey);
        if (organizationId != null) evictCache(null, flagKey);
        String scope = organizationId == null ? "GLOBAL" : organizationId.toString();
        if (actingUserId != null) {
            auditLogService.logUserAction(actingUserId, "FEATURE_FLAG_CHANGED",
                    "flag=" + flagKey + " org=" + scope + " before=" + before + " after=" + enabled + " source=" + source);
        }
        log.info("Feature flag {} = {} for {} (source={}, by {})", flagKey, enabled, scope, source, actingUserId);
        return saved;
    }

    /**
     * Re-provisions plan-derived feature flags for a subscription.
     *
     * <p>This is the only entitlement entry point, and it takes the whole
     * subscription rather than loose status/plan arguments on purpose: an
     * admin-granted comp lives on the row, and a caller passing just
     * {@code (status, plan)} would silently strip a live grant every time
     * Stripe fired a webhook.
     */
    @Transactional
    public void provisionFlagsFor(OrgSubscription sub) {
        OrgSubscription.Plan comp = sub.activeComp();
        OrgSubscription.Plan effective = comp != null
                ? comp
                : effectivePlan(sub.getStatus(), sub.getPlan());
        if (effective == null) return;

        for (String flagKey : PlanFeatureMatrix.ALL_GATED_FLAGS) {
            var existing = repository.findByOrganizationIdAndFlagKey(sub.getOrgId(), flagKey);
            if (existing.isPresent() && existing.get().getSource() == FeatureFlag.FlagSource.MANUAL) continue;
            boolean shouldEnable = PlanFeatureMatrix.includes(effective, flagKey);
            set(sub.getOrgId(), flagKey, shouldEnable, null, null, FeatureFlag.FlagSource.PLAN);
        }
        log.info("Provisioned feature flags for org {} (status={}, plan={}, comp={}, effective={})",
                sub.getOrgId(), sub.getStatus(), sub.getPlan(), comp, effective);
    }

    @Transactional
    public void deleteManualOverride(UUID organizationId, String flagKey) {
        (organizationId == null
                ? repository.findGlobalByFlagKey(flagKey)
                : repository.findByOrganizationIdAndFlagKey(organizationId, flagKey))
                .filter(f -> f.getSource() == FeatureFlag.FlagSource.MANUAL)
                .ifPresent(f -> {
                    repository.delete(f);
                    evictCache(organizationId, flagKey);
                    log.info("Deleted MANUAL override for flag {} on org {}", flagKey, organizationId);
                });
        if (organizationId == null) return;
        orgSubscriptionRepository.findByOrgId(organizationId).ifPresent(sub -> {
            OrgSubscription.Plan comp = sub.activeComp();
            OrgSubscription.Plan effective = comp != null
                    ? comp
                    : effectivePlan(sub.getStatus(), sub.getPlan());
            if (effective == null) return;
            boolean shouldEnable = PlanFeatureMatrix.includes(effective, flagKey);
            set(organizationId, flagKey, shouldEnable, null, null, FeatureFlag.FlagSource.PLAN);
        });
    }

    public List<FeatureFlag> listForOrg(UUID organizationId) {
        return repository.findByOrganizationId(organizationId);
    }

    public List<FeatureFlag> listGlobal() {
        return repository.findByOrganizationIdIsNull();
    }

    private OrgSubscription.Plan effectivePlan(OrgSubscription.Status status, OrgSubscription.Plan plan) {
        return switch (status) {
            case TRIAL               -> OrgSubscription.Plan.STARTER;
            case ACTIVE              -> plan;
            case PAST_DUE            -> null;
            case CANCELLED, INACTIVE -> OrgSubscription.Plan.NONE;
        };
    }

    private boolean resolveFromDb(UUID organizationId, String flagKey, boolean fallback) {
        if (organizationId != null) {
            var tenant = repository.findByOrganizationIdAndFlagKey(organizationId, flagKey);
            if (tenant.isPresent()) return Boolean.TRUE.equals(tenant.get().getEnabled());
        }
        var global = repository.findGlobalByFlagKey(flagKey);
        if (global.isPresent()) return Boolean.TRUE.equals(global.get().getEnabled());
        return fallback;
    }

    private String cacheKey(UUID organizationId, String flagKey) {
        return KEY_PREFIX + (organizationId == null ? "GLOBAL" : organizationId) + ":" + flagKey;
    }

    private Boolean readCached(UUID organizationId, String flagKey) {
        try {
            String v = redis.opsForValue().get(cacheKey(organizationId, flagKey));
            return v == null ? null : "1".equals(v);
        } catch (Exception e) {
            log.warn("Feature-flag cache read failed for {}: {}", flagKey, e.getMessage());
            return null;
        }
    }

    private void writeCached(UUID organizationId, String flagKey, boolean enabled) {
        try {
            redis.opsForValue().set(cacheKey(organizationId, flagKey), enabled ? "1" : "0", CACHE_TTL);
        } catch (Exception e) {
            log.warn("Feature-flag cache write failed for {}: {}", flagKey, e.getMessage());
        }
    }

    private void evictCache(UUID organizationId, String flagKey) {
        try {
            redis.delete(cacheKey(organizationId, flagKey));
        } catch (Exception e) {
            log.warn("Feature-flag cache evict failed for {}: {}", flagKey, e.getMessage());
        }
    }
}
