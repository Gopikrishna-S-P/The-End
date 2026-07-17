package com.recoverpro.server.lucien.planner;

/** One step in a manager-specified day plan (Layer 2 — scaffolded, not yet active). */
public record PlanStep(
        int stepIndex,
        String toolName,
        String argsJson,
        String description
) {}
