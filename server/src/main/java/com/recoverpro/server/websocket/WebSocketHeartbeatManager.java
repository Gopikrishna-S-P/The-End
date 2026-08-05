package com.recoverpro.server.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Component
public class WebSocketHeartbeatManager {

    static final long PING_INTERVAL_MS = 30_000L;
    static final long PONG_TIMEOUT_MS  = 60_000L;

    private static final TextMessage PING = new TextMessage("{\"type\":\"ping\"}");

    private record SessionEntry(WebSocketSession session, long tokenExpiryMs, AtomicLong lastPongMs) {}

    private final ConcurrentHashMap<String, SessionEntry> sessions = new ConcurrentHashMap<>();

    public void register(WebSocketSession session) {
        Object attr = session.getAttributes().get(WebSocketSessionAttributes.TOKEN_EXPIRY_ATTR);
        long expiryMs = (attr instanceof Long l) ? l : Long.MAX_VALUE;
        sessions.put(session.getId(),
                new SessionEntry(session, expiryMs, new AtomicLong(System.currentTimeMillis())));
        log.debug("WS session registered for heartbeat: id={}", session.getId());
    }

    public void unregister(String sessionId) {
        sessions.remove(sessionId);
    }

    public void recordPong(String sessionId) {
        SessionEntry entry = sessions.get(sessionId);
        if (entry != null) entry.lastPongMs().set(System.currentTimeMillis());
    }

    @Scheduled(fixedDelay = PING_INTERVAL_MS)
    public void tick() {
        long now = System.currentTimeMillis();
        for (SessionEntry entry : sessions.values()) {
            WebSocketSession ws = entry.session();
            if (!ws.isOpen()) {
                sessions.remove(ws.getId());
                continue;
            }
            if (now >= entry.tokenExpiryMs()) {
                close(ws, CloseStatus.POLICY_VIOLATION.withReason("token expired"));
                continue;
            }
            if (now - entry.lastPongMs().get() > PONG_TIMEOUT_MS) {
                close(ws, CloseStatus.SESSION_NOT_RELIABLE.withReason("pong timeout"));
                continue;
            }
            sendPing(ws);
        }
    }

    private void close(WebSocketSession ws, CloseStatus status) {
        sessions.remove(ws.getId());
        try { ws.close(status); } catch (IOException ignored) {}
        log.info("WS session closed by heartbeat manager: id={} reason={}", ws.getId(), status.getReason());
    }

    private void sendPing(WebSocketSession ws) {
        try { ws.sendMessage(PING); }
        catch (IOException e) { log.debug("Ping send failed (session closing): id={}", ws.getId()); }
    }
}
