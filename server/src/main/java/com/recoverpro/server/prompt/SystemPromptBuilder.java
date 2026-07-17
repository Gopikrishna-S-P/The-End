package com.recoverpro.server.prompt;

import com.recoverpro.server.dto.response.AgentContextDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
public class SystemPromptBuilder {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    /** Standard build (no tool schemas). */
    public String build(String promptTemplate, AgentContextDto ctx) {
        return buildWithTools(promptTemplate, ctx, "");
    }

    /** Full build with tool schema block and context block appended. */
    public String buildWithTools(String promptTemplate, AgentContextDto ctx, String appendBlock) {
        String today = LocalDate.now().format(DATE_FMT);

        String prompt = promptTemplate
                .replace("{{AGENT_FIRST_NAME}}", ctx.getAgentFirstName())
                .replace("{{TODAY_DATE}}", today)
                .replace("{{TOTAL_ASSIGNED_TODAY}}", String.valueOf(ctx.getTotalAssignedToday()))
                .replace("{{COMPLETED_TODAY}}", String.valueOf(ctx.getCompletedToday()))
                .replace("{{PENDING_TODAY}}", String.valueOf(ctx.getPendingToday()))
                .replace("{{OVERDUE_CASES}}", String.valueOf(ctx.getOverdueCases()))
                .replace("{{ACTIVE_PTPS}}", String.valueOf(ctx.getActivePtps()))
                .replace("{{BROKEN_PTPS}}", String.valueOf(ctx.getBrokenPtps()))
                .replace("{{COLLECTION_EFFICIENCY}}", ctx.getCollectionEfficiencyPercent().toPlainString())
                .replace("{{PTP_FULFILLMENT_RATE}}", ctx.getPtpFulfillmentRatePercent().toPlainString())
                .replace("{{TOTAL_COLLECTIONS_THIS_MONTH}}", String.valueOf(ctx.getTotalCollectionsThisMonth()));

        if (appendBlock != null && !appendBlock.isBlank()) {
            prompt = prompt + "\n" + appendBlock;
        }
        log.debug("SystemPromptBuilder: built system prompt for agent '{}'", ctx.getAgentFirstName());
        return prompt;
    }
}
