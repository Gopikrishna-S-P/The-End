package com.recoverpro.server.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.recoverpro.server.entity.IncidentReport;
import com.recoverpro.server.repository.IncidentReportRepository;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.security.jwt.JwtHandshakeInterceptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Live SOS-audio relay to supervisors monitoring an active incident.
 *
 * Protocol (JSON text frames, matching web/src/pages/SosLiveMonitor.tsx exactly):
 *   Supervisor → server: { "type":"subscribe", "incidentId" }
 *   Server → supervisor: { "type":"chunk", "chunk": <base64 audio bytes> }
 *   Server → supervisor: { "type":"location", "lat", "lng", "accuracy"?, "heading"? }
 *   Server → supervisor: { "type":"end" }
 *
 * There is no FO-side WebSocket publisher today -- SosLiveMonitor.tsx is purely a consumer.
 * The actual audio source is the existing periodic REST upload (POST /api/v1/agent/sos/audio,
 * AgentFieldServiceImpl.storeSosAudio), which now also calls relayAudioChunk() after each
 * successful store, so a supervisor watching an active incident hears each clip as it arrives
 * rather than only ever finding an empty audio history after the fact.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SosAudioWebSocketHandler extends TextWebSocketHandler {

    // Same supervisor-tier role set AgentFieldController gates incident actions
    // (resolve/cancel) with -- an FO or lower-privilege role has no business
    // listening to another agent's live SOS audio.
    private static final Set<String> SUPERVISOR_ROLES =
            Set.of("ROLE_ORG_ADMIN", "ROLE_PLATFORM_ADMIN", "ROLE_MANAGER", "ROLE_TL");

    private final ObjectMapper objectMapper;
    private final IncidentReportRepository incidentRepository;
    private final PlatformAdminAccessGuard platformAdminAccessGuard;

    // incidentId -> subscribed supervisor sessions
    private final ConcurrentHashMap<UUID, CopyOnWriteArraySet<WebSocketSession>> subscribersByIncident =
            new ConcurrentHashMap<>();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        UserPrincipal principal = principalOrClose(session);
        if (principal == null) return;

        JsonNode node = objectMapper.readTree(message.getPayload());
        if (!"subscribe".equals(node.path("type").asText())) return;

        String incidentIdStr = node.path("incidentId").asText();
        if (incidentIdStr.isBlank()) return;

        UUID incidentId;
        try {
            incidentId = UUID.fromString(incidentIdStr);
        } catch (IllegalArgumentException e) {
            log.warn("SOS audio subscribe rejected: invalid incidentId '{}'", incidentIdStr);
            return;
        }

        if (!isAuthorizedForIncident(principal, incidentId)) {
            log.warn("SOS audio subscribe rejected: user={} not authorized for incident={}",
                    principal.getId(), incidentId);
            return;
        }

        subscribersByIncident.computeIfAbsent(incidentId, k -> new CopyOnWriteArraySet<>()).add(session);
        log.info("Supervisor subscribed to SOS audio: session={} incident={}", session.getId(), incidentId);
    }

    private boolean isAuthorizedForIncident(UserPrincipal principal, UUID incidentId) {
        boolean isPlatformAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_PLATFORM_ADMIN".equals(a.getAuthority()));
        boolean isSupervisor = principal.getAuthorities().stream()
                .anyMatch(a -> SUPERVISOR_ROLES.contains(a.getAuthority()));
        if (!isSupervisor) return false;

        // WebSocket message handling runs on its own thread, which never passes through
        // RlsContextFilter (that's an HTTP servlet filter, only invoked for the original
        // handshake request) -- so RlsOrgIdHolder is empty here by default, and fail-closed
        // RLS would silently hide this row from *everyone*, not just unauthorized callers.
        // Stamp the same context RlsContextFilter would have set for an equivalent HTTP request.
        RlsOrgIdHolder.set(principal.getOrganizationId());
        if (isPlatformAdmin) {
            platformAdminAccessGuard.beginUnattendedCrossOrgAccess(
                    principal.getId(), "sos-audio:subscribe incident=" + incidentId);
        }
        try {
            IncidentReport incident = incidentRepository.findById(incidentId).orElse(null);
            if (incident == null) return false;
            return isPlatformAdmin || incident.getOrganizationId().equals(principal.getOrganizationId());
        } finally {
            RlsOrgIdHolder.clear();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        subscribersByIncident.values().forEach(set -> set.remove(session));
    }

    /** Called by AgentFieldServiceImpl.storeSosAudio() after persisting each uploaded clip. */
    public void relayAudioChunk(UUID incidentId, byte[] audioBytes) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("type", "chunk");
        n.put("chunk", Base64.getEncoder().encodeToString(audioBytes));
        broadcast(incidentId, n);
    }

    /** Called by AgentFieldServiceImpl alongside audio, when a fresh location is available. */
    public void relayLocation(UUID incidentId, double lat, double lng, Double accuracy, Double heading) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("type", "location");
        n.put("lat", lat);
        n.put("lng", lng);
        if (accuracy != null) n.put("accuracy", accuracy);
        if (heading != null) n.put("heading", heading);
        broadcast(incidentId, n);
    }

    /** Called when an incident is resolved/cancelled, so open monitors know the stream is over. */
    public void relayEnd(UUID incidentId) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("type", "end");
        broadcast(incidentId, n);
        subscribersByIncident.remove(incidentId);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private void broadcast(UUID incidentId, ObjectNode node) {
        CopyOnWriteArraySet<WebSocketSession> subs = subscribersByIncident.get(incidentId);
        if (subs == null || subs.isEmpty()) return;
        String json;
        try {
            json = objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            log.warn("SOS audio relay serialization failed: {}", e.getMessage());
            return;
        }
        TextMessage msg = new TextMessage(json);
        for (WebSocketSession sub : subs) {
            if (sub.isOpen()) {
                try { sub.sendMessage(msg); } catch (IOException ignored) {}
            }
        }
    }

    private UserPrincipal principalOrClose(WebSocketSession session) {
        Object attr = session.getAttributes().get(JwtHandshakeInterceptor.PRINCIPAL_ATTR);
        if (attr instanceof UserPrincipal p) return p;
        try { session.close(CloseStatus.POLICY_VIOLATION.withReason("missing principal")); }
        catch (IOException ignored) {}
        return null;
    }
}
