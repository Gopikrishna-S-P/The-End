package com.recoverpro.server.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recoverpro.server.entity.AppNotification;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Real-time notification push over SSE (BCR-4). Same local-subscriber-registry +
 * Redis-pub/sub-fanout shape as LiveTrackRedisSubscriber, so delivery works across
 * multiple app instances -- a create() on one node still reaches an SSE connection
 * held open on another.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationSseService implements MessageListener {

    static final String CHANNEL_PATTERN = "notifications:user:*";
    static final String CHANNEL_PREFIX  = "notifications:user:";

    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;
    private final RedisMessageListenerContainer liveTrackListenerContainer;

    private final Map<UUID, CopyOnWriteArraySet<SseEmitter>> localSubscribers = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        liveTrackListenerContainer.addMessageListener(this, new PatternTopic(CHANNEL_PATTERN));
        log.info("Notification SSE subscriber registered on pattern '{}'", CHANNEL_PATTERN);
    }

    public SseEmitter subscribe(UUID userId) {
        SseEmitter emitter = new SseEmitter(0L);
        localSubscribers.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>()).add(emitter);
        emitter.onCompletion(() -> removeLocalSubscriber(userId, emitter));
        emitter.onTimeout(() -> removeLocalSubscriber(userId, emitter));
        emitter.onError(e -> removeLocalSubscriber(userId, emitter));
        return emitter;
    }

    public void publish(AppNotification notification) {
        try {
            String json = objectMapper.writeValueAsString(notification);
            redisTemplate.convertAndSend(CHANNEL_PREFIX + notification.getRecipientId(), json);
        } catch (Exception e) {
            log.warn("Failed to publish notification {} to Redis: {}", notification.getId(), e.getMessage());
        }
    }

    @Override
    public void onMessage(Message message, @Nullable byte[] pattern) {
        String channel = new String(message.getChannel());
        String userIdStr = channel.substring(CHANNEL_PREFIX.length());

        UUID userId;
        try {
            userId = UUID.fromString(userIdStr);
        } catch (IllegalArgumentException e) {
            log.warn("Notification SSE: invalid userId in channel '{}'", channel);
            return;
        }

        CopyOnWriteArraySet<SseEmitter> subs = localSubscribers.get(userId);
        if (subs == null || subs.isEmpty()) return;

        String payload = new String(message.getBody());
        for (SseEmitter emitter : subs) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(payload));
            } catch (IOException e) {
                removeLocalSubscriber(userId, emitter);
            }
        }
    }

    private void removeLocalSubscriber(UUID userId, SseEmitter emitter) {
        CopyOnWriteArraySet<SseEmitter> set = localSubscribers.get(userId);
        if (set != null) {
            set.remove(emitter);
            if (set.isEmpty()) localSubscribers.remove(userId);
        }
    }
}
