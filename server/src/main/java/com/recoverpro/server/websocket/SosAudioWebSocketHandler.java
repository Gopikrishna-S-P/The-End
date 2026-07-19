package com.recoverpro.server.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

    private final ObjectMapper objectMapper;

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

        subscribersByIncident.computeIfAbsent(incidentId, k -> new CopyOnWriteArraySet<>()).add(session);
        log.info("Supervisor subscribed to SOS audio: session={} incident={}", session.getId(), incidentId);
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
