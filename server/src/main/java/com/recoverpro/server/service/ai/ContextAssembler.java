package com.recoverpro.server.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recoverpro.server.service.AssignmentService;
import com.recoverpro.server.service.CallingHoursGuard;
import com.recoverpro.server.service.PtpService;
import com.recoverpro.server.service.VisitLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Assembles the current operational context for the agent into a text block
 * injected into the system prompt (design-doc §6.1, step 4).
 *
 * Context is built per-turn for now; caching in Redis per session is a follow-up.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContextAssembler {

    private final AssignmentService assignmentService;
    private final VisitLogService visitLogService;
    private final PtpService ptpService;
    private final CallingHoursGuard callingHoursGuard;
    private final ObjectMapper objectMapper;

    public String assembleFor(UUID agentId, UUID organizationId) {
        StringBuilder sb = new StringBuilder("\n=== CURRENT OPERATIONAL CONTEXT ===\n");

        // Active cases
        try {
            var cases = assignmentService.getMyActiveCases(agentId, organizationId, PageRequest.of(0, 20));
            sb.append("ACTIVE_CASES (").append(cases.getTotalElements()).append(" total):\n");
            cases.getContent().forEach(c -> sb.append("  - ").append(summarizeCase(c)).append("\n"));

            // PTP status for active cases
            List<UUID> allocationIds = cases.getContent().stream()
                    .map(com.recoverpro.server.dto.response.MyAssignedCaseResponse::getAllocationId)
                    .filter(id -> id != null)
                    .collect(Collectors.toList());

            if (!allocationIds.isEmpty()) {
                var ptps = ptpService.getPtpsByAllocationIds(allocationIds);
                sb.append("OPEN_PTPS (").append(ptps.size()).append("):\n");
                ptps.forEach(p -> sb.append("  - ").append(summarizePtp(p)).append("\n"));
            }
        } catch (Exception e) {
            log.warn("ContextAssembler: could not load active cases for agent={}: {}", agentId, e.getMessage());
            sb.append("ACTIVE_CASES: unavailable\n");
        }

        // Today's visits
        try {
            var visits = visitLogService.getTodayVisits(agentId);
            sb.append("TODAY_VISITS (").append(visits.size()).append("):\n");
            visits.forEach(v -> sb.append("  - ").append(summarizeVisit(v)).append("\n"));
        } catch (Exception e) {
            log.warn("ContextAssembler: could not load visits for agent={}: {}", agentId, e.getMessage());
            sb.append("TODAY_VISITS: unavailable\n");
        }

        // Calling hours
        try {
            ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
            boolean callingAllowed = callingHoursGuard.isAllowedFor(organizationId, now);
            sb.append("CALLING_HOURS_ALLOWED: ").append(callingAllowed).append("\n");
            if (!callingAllowed) {
                String reason = callingHoursGuard.denialReason(organizationId, now);
                sb.append("CALLING_HOURS_BLOCKED_REASON: ").append(reason).append("\n");
            }
        } catch (Exception e) {
            log.warn("ContextAssembler: calling hours check failed: {}", e.getMessage());
        }

        sb.append("=== END CONTEXT ===\n");
        return sb.toString();
    }

    // Explicit per-item summaries, not blanket toString() - and deliberately excludes PII
    // (dynamicData, contact numbers, GPS, free-text notes) since this text is sent to the LLM.

    private String summarizeCase(com.recoverpro.server.dto.response.MyAssignedCaseResponse c) {
        return "Loan " + c.getLoanNumber() + " (" + c.getBorrowerName() + "): outstanding=" + c.getOutstandingAmount()
                + ", totalDue=" + c.getTotalDue() + ", status=" + c.getAllocationStatus()
                + ", priority=" + c.getPriority() + ", npaFlagged=" + c.getNpaFlagged()
                + ", lastVisit=" + c.getLastVisitDate() + "/" + c.getLastVisitDisposition();
    }

    private String summarizePtp(com.recoverpro.server.dto.response.PtpResponse p) {
        return "Loan " + p.getLoanNumber() + " (" + p.getBorrowerName() + "): promised=" + p.getPromisedAmount()
                + " by " + p.getPromisedDate() + ", status=" + p.getStatus()
                + ", collected=" + p.getCollectedAmount();
    }

    private String summarizeVisit(com.recoverpro.server.dto.response.VisitLogResponse v) {
        return "Allocation " + v.getAllocationId() + ": visitDate=" + v.getVisitDate()
                + ", disposition=" + v.getDisp() + ", outcome=" + v.getVisitOutcome()
                + ", nextVisit=" + v.getNextVisitDate() + ", amountCollected=" + v.getAmountCollected();
    }
}
