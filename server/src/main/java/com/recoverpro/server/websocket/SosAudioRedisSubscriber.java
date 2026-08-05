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
 * Cross-pod relay for SosAudioWebSocketHandler, registered on the same shared
 * Redis listener container as LiveTrackRedisSubscriber. See that class for the
 * origin-echo rationale -- every pod subscribes to every pod's own publishes
 * (including its own), so self-originated messages must be skipped here.
 */
@Slf4j
@Component
public class SosAudioRedisSubscriber implements MessageListener {

    static final String CHANNEL_PATTERN = "sos-audio:incident:*";
    static final String CHANNEL_PREFIX  = "sos-audio:incident:";

    private final ObjectMapper objectMapper;
    private final RedisMessageListenerContainer liveTrackListenerContainer;
    private final SosAudioWebSocketHandler sosAudioWebSocketHandler;
    private final String podInstanceId;

    public SosAudioRedisSubscriber(ObjectMapper objectMapper,
                                   RedisMessageListenerContainer liveTrackListenerContainer,
                                   SosAudioWebSocketHandler sosAudioWebSocketHandler,
                                   @Qualifier("podInstanceId") String podInstanceId) {
        this.objectMapper               = objectMapper;
        this.liveTrackListenerContainer = liveTrackListenerContainer;
        this.sosAudioWebSocketHandler   = sosAudioWebSocketHandler;
        this.podInstanceId              = podInstanceId;
    }

    @PostConstruct
    public void init() {
        liveTrackListenerContainer.addMessageListener(this, new PatternTopic(CHANNEL_PATTERN));
        log.info("SOS-audio Redis subscriber registered on pattern '{}'", CHANNEL_PATTERN);
    }

    @Override
    public void onMessage(Message message, @Nullable byte[] pattern) {
        String channel      = new String(message.getChannel());
        String incidentIdStr = channel.substring(CHANNEL_PREFIX.length());

        UUID incidentId;
        try {
            incidentId = UUID.fromString(incidentIdStr);
        } catch (IllegalArgumentException e) {
            log.warn("SOS audio: invalid incidentId in channel '{}'", channel);
            return;
        }

        String rawJson = new String(message.getBody());
        JsonNode node;
        try {
            node = objectMapper.readTree(rawJson);
        } catch (Exception e) {
            log.warn("SOS audio: malformed Redis message on channel '{}'", channel);
            return;
        }

        if (podInstanceId.equals(node.path("origin").asText())) return;

        sosAudioWebSocketHandler.deliverFromRedis(incidentId, node, rawJson);
    }
}
