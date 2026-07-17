package com.recoverpro.server.lucien.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.recoverpro.server.security.UserPrincipal;

/**
 * One callable tool in the Lucien ReAct loop (design-doc §6.2).
 * READ tools execute immediately; WRITE tools route through the confirmation gate.
 */
public interface LucienTool {

    /** Stable name used in model schema and routing. */
    String name();

    /** Plain-English description injected into the system prompt. */
    String description();

    /** JSON Schema object string describing the arguments this tool accepts. */
    String parametersSchema();

    /** True → confirmation required before execution (WRITE operation). */
    boolean isWriteOperation();

    /** Human-readable summary shown to user in the confirmation prompt (WRITE tools only). */
    String humanReadableSummary(JsonNode args);

    /** Execute the tool. Always enforces org isolation via OrgIsolationGuard. */
    String execute(JsonNode args, UserPrincipal principal);
}
