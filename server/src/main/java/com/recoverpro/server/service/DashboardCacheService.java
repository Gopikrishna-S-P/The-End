package com.recoverpro.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Thin Redis cache wrapper for dashboard sections.
 * Today KPIs: 30s TTL (near-real-time).
 * Platform totals: 60s TTL.
 * Never caches snapshot-table reads — those are already pre-aggregated.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardCacheService {

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public static final Duration TODAY_TTL    = Duration.ofSeconds(30);
    public static final Duration PLATFORM_TTL = Duration.ofSeconds(60);

    public static String todayKey(UUID orgId)   { return "dash:today:" + orgId; }
    public static String platformKey()          { return "dash:platform"; }

    public <T> T getOrCompute(String key, Duration ttl, Supplier<T> compute, Class<T> type) {
        try {
            String cached = redis.opsForValue().get(key);
            if (cached != null) return objectMapper.readValue(cached, type);
        } catch (Exception e) {
            log.debug("Dashboard cache read miss or parse error for key={}: {}", key, e.getMessage());
        }
        T value = compute.get();
        try {
            redis.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (Exception e) {
            log.warn("Dashboard cache write failed for key={}: {}", key, e.getMessage());
        }
        return value;
    }

    public void evict(String key) {
        redis.delete(key);
    }
}
