package com.recoverpro.server.lucien.planner;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Stub — Day Planner Layer 2 is deferred post Phase 3-I.
 * Will use ToolRegistry + ModelClientPort to generate a plan from a manager goal string.
 */
@Slf4j
@Service
public class DayPlannerServiceImpl implements DayPlannerService {

    @Override
    public List<PlanStep> buildPlan(String goal, UUID agentId, UUID organizationId) {
        log.warn("DayPlannerService.buildPlan called but Layer 2 is not yet implemented. goal='{}'", goal);
        return List.of();
    }
}
