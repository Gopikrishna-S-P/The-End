package com.recoverpro.server.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Per-item outcome of {@code POST /api/v1/agent/sync}. The mobile client
 * uses {@code clientId} to drop successful items from its local queue.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentSyncResponse {

    private int succeeded;
    private int failed;
    private List<ItemResult> results;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ItemResult {
        /** Echo of the client-supplied id. */
        private String clientId;
        private String kind;
        private boolean success;
        /** Server-side id of the created entity on success. */
        private String serverId;
        /** Error message on failure (no stack trace). */
        private String error;
    }
}
