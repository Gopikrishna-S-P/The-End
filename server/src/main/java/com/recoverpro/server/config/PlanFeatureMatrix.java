package com.recoverpro.server.config;

import com.recoverpro.server.entity.OrgSubscription.Plan;

import java.util.Map;
import java.util.Set;

public final class PlanFeatureMatrix {

    private PlanFeatureMatrix() {}

    public static final String LUCIEN_AI           = "LUCIEN_AI";
    public static final String ADVANCED_REPORTS    = "ADVANCED_REPORTS";
    public static final String CUSTOM_INTEGRATIONS = "CUSTOM_INTEGRATIONS";

    public static final Set<String> ALL_GATED_FLAGS = Set.of(
            LUCIEN_AI, ADVANCED_REPORTS, CUSTOM_INTEGRATIONS
    );

    private static final Map<Plan, Set<String>> MATRIX = Map.of(
            Plan.NONE,       Set.of(),
            Plan.STARTER,    Set.of(),
            Plan.GROWTH,     Set.of(LUCIEN_AI, ADVANCED_REPORTS),
            Plan.ENTERPRISE, Set.of(LUCIEN_AI, ADVANCED_REPORTS, CUSTOM_INTEGRATIONS)
    );

    public static boolean includes(Plan plan, String flagKey) {
        if (plan == null || flagKey == null) return false;
        return MATRIX.getOrDefault(plan, Set.of()).contains(flagKey);
    }

    public static String requiredPlanLabel(String flagKey) {
        return switch (flagKey) {
            case LUCIEN_AI, ADVANCED_REPORTS -> "Growth";
            case CUSTOM_INTEGRATIONS         -> "Enterprise";
            default                          -> "Growth";
        };
    }
}
