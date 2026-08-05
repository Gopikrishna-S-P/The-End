package com.recoverpro.server.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import java.util.UUID;

/**
 * Owns the shared Redis pub/sub container behind live-location fan-out
 * (LiveTrackRedisSubscriber), SOS-audio fan-out (SosAudioRedisSubscriber), and
 * notification push (NotificationSseService).
 *
 * RedisMessageListenerContainer is a SmartLifecycle with no public
 * setAutoStartup toggle -- Spring always calls its start() synchronously
 * during application context refresh, and start() itself performs the
 * initial subscribe connection synchronously too. An unreachable Redis at
 * boot therefore throws there and fails the *entire* application context, a
 * hard single point of failure unlike every other Redis touchpoint in this
 * codebase (all coded best-effort/non-fatal). The anonymous override below
 * catches that failure inside start() itself and retries on a background
 * daemon thread instead of letting it propagate, so a Redis outage at boot
 * degrades pub/sub fan-out instead of preventing the app from starting.
 */
@Slf4j
@Configuration
public class LiveTrackRedisConfig {

    private static final long RETRY_INTERVAL_MS = 10_000;

    @Bean
    public RedisMessageListenerContainer liveTrackListenerContainer(RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer() {
            @Override
            public void start() {
                try {
                    super.start();
                    log.info("Redis pub/sub listener container started "
                            + "(live-track + SOS-audio + notification fan-out).");
                } catch (Exception e) {
                    log.warn("Redis pub/sub listener container failed to start ({}) -- retrying in {}ms. "
                                    + "Cross-pod live-track fan-out, SOS-audio fan-out, and notification push "
                                    + "are unavailable until Redis is reachable.",
                            e.getMessage(), RETRY_INTERVAL_MS);
                    Thread retry = new Thread(() -> {
                        try {
                            Thread.sleep(RETRY_INTERVAL_MS);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            return;
                        }
                        start();
                    }, "redis-pubsub-starter");
                    retry.setDaemon(true);
                    retry.start();
                }
            }
        };
        container.setConnectionFactory(connectionFactory);
        return container;
    }

    /**
     * Stable for this JVM's lifetime, unique per pod. Redis-published live-track and
     * SOS-audio messages carry this as "origin" so the publishing pod's own Redis
     * subscription (every pod subscribes to the same pattern, including itself) can
     * recognize and skip its own messages -- they were already delivered to local
     * WebSocket sessions synchronously at publish time, via the fast in-process path.
     * Without this, every message would be delivered twice on the pod that published it.
     */
    @Bean
    public String podInstanceId() {
        return UUID.randomUUID().toString();
    }
}
