package com.recoverpro.server.lucien.planner;

import java.util.List;
import java.util.UUID;

/**
 * Layer 2 — Day Planner (scaffolded in Phase 3-I; active in a future phase).
 * Manager states a goal; the planner generates a sequence of tool steps.
 */
public interface DayPlannerService {

    List<PlanStep> buildPlan(String goal, UUID agentId, UUID organizationId);
}
