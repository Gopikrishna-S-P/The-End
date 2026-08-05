package com.recoverpro.server.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Cross-pod relay for LiveTrackWebSocketHandler: every pod publishes its own
 * WebSocket/REST-ping updates to Redis AND subscribes to every pod's updates
 * (including its own -- see the origin check below), so a supervisor connected
 * to pod B sees an agent whose location just landed on pod A.
 */
@Slf4j
@Component
public class LiveTrackRedisSubscriber implements MessageListener {

    static final String CHANNEL_PATTERN = "livetrack:pos:*";
    static final String CHANNEL_PREFIX  = "livetrack:pos:";

    private final ObjectMapper objectMapper;
    private final RedisMessageListenerContainer liveTrackListenerContainer;
    private final LiveTrackWebSocketHandler liveTrackWebSocketHandler;
    private final String podInstanceId;

    public LiveTrackRedisSubscriber(ObjectMapper objectMapper,
                                    RedisMessageListenerContainer liveTrackListenerContainer,
                                    LiveTrackWebSocketHandler liveTrackWebSocketHandler,
                                    @Qualifier("podInstanceId") String podInstanceId) {
        this.objectMapper                = objectMapper;
        this.liveTrackListenerContainer  = liveTrackListenerContainer;
        this.liveTrackWebSocketHandler   = liveTrackWebSocketHandler;
        this.podInstanceId               = podInstanceId;
    }

    @PostConstruct
    public void init() {
        liveTrackListenerContainer.addMessageListener(this, new PatternTopic(CHANNEL_PATTERN));
        log.info("LiveTrack Redis subscriber registered on pattern '{}'", CHANNEL_PATTERN);
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

        String rawJson = new String(message.getBody());
        JsonNode node;
        try {
            node = objectMapper.readTree(rawJson);
        } catch (Exception e) {
            log.warn("LiveTrack: malformed Redis message on channel '{}'", channel);
            return;
        }

        // This pod's own publish already delivered locally at publish time (the
        // in-process fast path) -- skip it here or every local subscriber would
        // get every update twice.
        if (podInstanceId.equals(node.path("origin").asText())) return;

        liveTrackWebSocketHandler.deliverFromRedis(orgId, node, rawJson);
    }
}
