package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.AgentSyncRequest;
import com.recoverpro.server.dto.response.AgentSyncResponse;
import com.recoverpro.server.dto.response.AgentSyncResponse.ItemResult;
import com.recoverpro.server.dto.response.CollectionResponse;
import com.recoverpro.server.dto.response.PtpResponse;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.exception.PendingPtpAlreadyExistsException;
import com.recoverpro.server.service.AgentSyncService;
import com.recoverpro.server.service.CollectionService;
import com.recoverpro.server.service.PtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Batched offline-sync orchestrator (design-doc §7.6).
 *
 * Per-item failure isolation: each item is attempted in its own
 * try/catch so one bad item doesn't fail the whole batch. Items that
 * already succeeded server-side are detected via the existing
 * idempotency keys on collections / PTPs -- replays return the existing
 * id rather than erroring.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentSyncServiceImpl implements AgentSyncService {

    private final CollectionService collectionService;
    private final PtpService ptpService;

    @Override
    public AgentSyncResponse process(AgentSyncRequest request, UUID actingUserId) {
        List<ItemResult> results = new ArrayList<>(request.getItems().size());
        int ok = 0;
        int fail = 0;

        for (AgentSyncRequest.Item item : request.getItems()) {
            String kind = item.getKind() == null ? "" : item.getKind().toUpperCase();
            try {
                switch (kind) {
                    case "COLLECTION" -> {
                        if (item.getCollection() == null) {
                            throw new IllegalArgumentException("collection payload missing");
                        }
                        CollectionResponse r = collectionService.submit(item.getCollection(), actingUserId);
                        results.add(ok(item, r.getId().toString()));
                        ok++;
                    }
                    case "PTP" -> {
                        if (item.getPtp() == null) {
                            throw new IllegalArgumentException("ptp payload missing");
                        }
                        String serverId;
                        try {
                            PtpResponse r = ptpService.createPtp(item.getPtp(), actingUserId);
                            serverId = r.getId().toString();
                        } catch (PendingPtpAlreadyExistsException replay) {
                            serverId = findExistingPendingPtpId(item.getPtp().getAllocationId())
                                    .orElseThrow(() -> replay);
                            log.info("Agent sync PTP item {} replayed against existing pending PTP {}",
                                    item.getClientId(), serverId);
                        }
                        results.add(ok(item, serverId));
                        ok++;
                    }
                    case "VISIT_METADATA" -> {
                        // Visits require photos by design-doc §7.1 (geo +
                        // photo proof). The mobile offline queue replays
                        // visits through POST /api/v1/visit-logs (multipart)
                        // per item, not through this batch endpoint.
                        throw new IllegalArgumentException(
                                "visits with photos go through POST /api/v1/visit-logs (multipart); "
                                        + "this batch endpoint is for COLLECTION + PTP only in v1");
                    }
                    default -> {
                        throw new IllegalArgumentException("unknown kind: " + kind);
                    }
                }
            } catch (Exception e) {
                log.warn("Agent sync item {} kind={} failed: {}",
                        item.getClientId(), kind, e.getMessage());
                results.add(ItemResult.builder()
                        .clientId(item.getClientId())
                        .kind(kind)
                        .success(false)
                        .error(truncate(e.getMessage(), 500))
                        .build());
                fail++;
            }
        }

        return AgentSyncResponse.builder()
                .succeeded(ok)
                .failed(fail)
                .results(results)
                .build();
    }

    private java.util.Optional<String> findExistingPendingPtpId(UUID allocationId) {
        return ptpService.getPtpsByAllocationId(allocationId).stream()
                .filter(p -> p.getStatus() == PtpStatus.PENDING)
                .findFirst()
                .map(p -> p.getId().toString());
    }

    private static ItemResult ok(AgentSyncRequest.Item item, String serverId) {
        return ItemResult.builder()
                .clientId(item.getClientId())
                .kind(item.getKind() == null ? null : item.getKind().toUpperCase())
                .success(true)
                .serverId(serverId)
                .build();
    }

    private static String truncate(String s, int n) {
        if (s == null) return "(unknown)";
        return s.length() <= n ? s : s.substring(0, n);
    }
}
