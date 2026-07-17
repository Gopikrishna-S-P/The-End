package com.recoverpro.server.service.ai;

import com.recoverpro.server.common.exception.RateLimitExceededException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatRateLimiter {

    private final StringRedisTemplate redisTemplate;

    @Value("${lucien.rate-limit.max-requests:20}")
    private int maxRequests;

    @Value("${lucien.rate-limit.window-seconds:60}")
    private long windowSeconds;

    private static final String KEY_PREFIX = "rate:chat:";

    // Atomic increment + conditional expire in a single Lua script.
    // Prevents the race where two threads both see count==0 and both set TTL,
    // or where increment and expire run on different connections.
    private static final DefaultRedisScript<Long> INCREMENT_SCRIPT = new DefaultRedisScript<>("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then
              redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return count
            """, Long.class);

    public void checkAndRecord(UUID agentId) {
        String key = KEY_PREFIX + agentId;
        try {
            Long count = redisTemplate.execute(INCREMENT_SCRIPT, List.of(key), String.valueOf(windowSeconds));
            if (count != null && count > maxRequests) {
                Long ttl = redisTemplate.getExpire(key);
                long retryAfter = ttl != null && ttl > 0 ? ttl : windowSeconds;
                log.warn("Chat rate limit exceeded: agentId={} count={}", agentId, count);
                throw new RateLimitExceededException(
                        "Too many requests. Limit is %d messages per %ds. Retry after %ds."
                                .formatted(maxRequests, windowSeconds, retryAfter),
                        retryAfter);
            }
        } catch (RateLimitExceededException e) {
            throw e;
        } catch (Exception e) {
            log.error("ChatRateLimiter Redis error — failing closed: {}", e.getMessage());
            throw new RateLimitExceededException(
                    "Chat service temporarily unavailable. Please try again in 30 seconds.", 30L);
        }
    }
}
