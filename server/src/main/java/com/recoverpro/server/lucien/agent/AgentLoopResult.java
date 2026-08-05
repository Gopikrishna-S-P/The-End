package com.recoverpro.server.lucien.agent;

import java.util.List;

/** Result of one ReAct loop turn. Either a final answer or a pause for user confirmation. */
public sealed interface AgentLoopResult
        permits AgentLoopResult.FinalAnswer, AgentLoopResult.ConfirmationRequired {

    record FinalAnswer(
            String text,
            int inputTokens,
            int outputTokens,
            List<AgentStep> steps
    ) implements AgentLoopResult {}

    record ConfirmationRequired(
            String pendingActionId,
            String actionSummary,
            String toolName,
            int inputTokens,
            int outputTokens,
            List<AgentStep> steps
    ) implements AgentLoopResult {}
}
