package com.recoverpro.server.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimiter {

    private static final String LOGIN_KEY_PREFIX = "rate:login:";

    // Atomic: increment and set TTL only on first call — no race between two commands.
    private static final DefaultRedisScript<Long> INCREMENT_SCRIPT = new DefaultRedisScript<>("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then
              redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return count
            """, Long.class);

    private final StringRedisTemplate redisTemplate;

    /**
     * Fail-open on Redis error: avoids locking out all users during an outage.
     * The primary brute-force defence is BCrypt/Argon2id cost, not this counter.
     */
    public boolean isAllowed(String clientKey, int maxAttempts, int windowMinutes) {
        String key = LOGIN_KEY_PREFIX + clientKey;
        try {
            Long count = redisTemplate.execute(INCREMENT_SCRIPT, List.of(key),
                    String.valueOf(Duration.ofMinutes(windowMinutes).toSeconds()));
            return count == null || count <= maxAttempts;
        } catch (Exception e) {
            log.error("Rate limiter Redis error for key {}: {}", key, e.getMessage());
            return true;
        }
    }

    public long getRemainingAttempts(String clientKey, int maxAttempts) {
        String key = LOGIN_KEY_PREFIX + clientKey;
        try {
            String value = redisTemplate.opsForValue().get(key);
            long current = value != null ? Long.parseLong(value) : 0;
            return Math.max(0, maxAttempts - current);
        } catch (Exception e) {
            log.error("Rate limiter getRemainingAttempts error for {}: {}", key, e.getMessage());
            return maxAttempts;
        }
    }

    public long getRetryAfterSeconds(String clientKey) {
        String key = LOGIN_KEY_PREFIX + clientKey;
        try {
            Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
            return ttl != null && ttl > 0 ? ttl : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    public void reset(String clientKey) {
        try {
            redisTemplate.delete(LOGIN_KEY_PREFIX + clientKey);
        } catch (Exception e) {
            log.error("Rate limiter reset error for {}: {}", clientKey, e.getMessage());
        }
    }

    /**
     * Generic rate limiter for non-login surfaces (MFA, exports, etc.).
     * Caller owns the full Redis key including namespace prefix.
     * Fail-open: TOTP entropy + short TOTP validity window are the primary MFA defence.
     */
    public boolean tryAcquire(String redisKey, int maxAttempts, Duration window) {
        try {
            Long count = redisTemplate.execute(INCREMENT_SCRIPT, List.of(redisKey),
                    String.valueOf(window.toSeconds()));
            return count == null || count <= maxAttempts;
        } catch (Exception e) {
            log.error("Rate limiter (tryAcquire) Redis error for {}: {}", redisKey, e.getMessage());
            return true;
        }
    }
}
