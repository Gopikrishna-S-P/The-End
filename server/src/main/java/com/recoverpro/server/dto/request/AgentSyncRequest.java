package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Batched offline sync from the mobile field-agent app (design-doc §7.6).
 *
 * The mobile client persists each event in a local queue while offline,
 * then POSTs the queue at /api/v1/agent/sync when connectivity returns.
 * Each item is processed independently -- partial success is reported back
 * as a per-item result so the client can drop only the successful ones
 * from its queue.
 *
 * Mixed event types are supported: collection submissions, PTP creations,
 * and bulk visit-log creates without photo uploads (photos go through the
 * existing multipart endpoint with the offline queue's per-item replay).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentSyncRequest {

    @NotEmpty
    private List<Item> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Item {
        /** Client-supplied stable id so the response can be matched back. */
        private String clientId;

        /** Event kind: "COLLECTION", "PTP", or "VISIT_METADATA". */
        private String kind;

        /** Collection submission. Null for non-COLLECTION items. */
        private SubmitCollectionRequest collection;

        /** PTP create. Null for non-PTP items. */
        private CreatePtpRequest ptp;

        /**
         * Visit log without photos. Null for non-VISIT_METADATA items.
         * Photos still go through {@code POST /api/v1/visit-logs} (multipart);
         * this is for the rare offline case where a visit's metadata is
         * captured without photos.
         */
        private VisitLogRequest visit;
    }
}