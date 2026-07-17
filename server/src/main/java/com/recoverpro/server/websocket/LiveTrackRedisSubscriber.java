package com.recoverpro.server.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Slf4j
@Component
@RequiredArgsConstructor
public class LiveTrackRedisSubscriber implements MessageListener {

    static final String CHANNEL_PATTERN = "livetrack:pos:*";
    static final String CHANNEL_PREFIX  = "livetrack:pos:";

    private final ObjectMapper objectMapper;
    private final RedisMessageListenerContainer liveTrackListenerContainer;

    private final ConcurrentHashMap<UUID, CopyOnWriteArraySet<WebSocketSession>> localSubscribers =
            new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        liveTrackListenerContainer.addMessageListener(this, new PatternTopic(CHANNEL_PATTERN));
        log.info("LiveTrack Redis subscriber registered on pattern '{}'", CHANNEL_PATTERN);
    }

    public void addLocalSubscriber(UUID orgId, WebSocketSession session) {
        localSubscribers.computeIfAbsent(orgId, k -> new CopyOnWriteArraySet<>()).add(session);
    }

    public void removeLocalSubscriber(UUID orgId, WebSocketSession session) {
        CopyOnWriteArraySet<WebSocketSession> set = localSubscribers.get(orgId);
        if (set != null) {
            set.remove(session);
            if (set.isEmpty()) localSubscribers.remove(orgId);
        }
    }

    @Override
    public void onMessage(Message message, @Nullable byte[] pattern) {
        String channel  = new String(message.getChannel());
        String orgIdStr = channel.substring(CHANNEL_PREFIX.length());

        UUID orgId;
        try {
            orgId = UUID.fromString(orgIdStr);
        } catch (IllegalArgumentException e) {
            log.warn("LiveTrack: invalid orgId in channel '{}'", channel);
            return;
        }

        CopyOnWriteArraySet<WebSocketSession> subs = localSubscribers.get(orgId);
        if (subs == null || subs.isEmpty()) return;

        TextMessage wsMsg = new TextMessage(new String(message.getBody()));
        for (WebSocketSession sub : subs) {
            if (sub.isOpen()) {
                try { sub.sendMessage(wsMsg); } catch (IOException ignored) {}
            }
        }
    }

    public Map<UUID, CopyOnWriteArraySet<WebSocketSession>> getLocalSubscribers() {
        return localSubscribers;
    }
}
