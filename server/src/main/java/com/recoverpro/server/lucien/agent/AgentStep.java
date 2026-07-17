package com.recoverpro.server.lucien.agent;

/**
 * One step in a ReAct iteration (thought → act → observe).
 * Persisted to lucien_agent_steps after each step for audit.
 */
public record AgentStep(
        String thought,
        String toolName,
        String toolInput,
        String toolOutput,
        boolean isWriteTool,
        boolean wasConfirmed
) {}
