package com.recoverpro.server.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyKeyService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String IDEMPOTENCY_KEY_PREFIX = "idempotency:";
    private static final String HTTP_RESPONSE_PREFIX   = "idempotency:http:";
    private static final long TTL_HOURS = 24;

    public void registerKey(String idempotencyKey, UUID collectionId) {
        try {
            redisTemplate.opsForValue().set(
                    IDEMPOTENCY_KEY_PREFIX + idempotencyKey,
                    collectionId.toString(), TTL_HOURS, TimeUnit.HOURS);
        } catch (Exception e) {
            log.error("Failed to register idempotency key: {}", e.getMessage());
        }
    }

    public UUID getCollectionId(String idempotencyKey) {
        try {
            String val = redisTemplate.opsForValue().get(IDEMPOTENCY_KEY_PREFIX + idempotencyKey);
            return val != null ? UUID.fromString(val) : null;
        } catch (Exception e) {
            log.error("Failed to retrieve idempotency key: {}", e.getMessage());
            return null;
        }
    }

    public boolean exists(String idempotencyKey) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(IDEMPOTENCY_KEY_PREFIX + idempotencyKey));
        } catch (Exception e) {
            log.error("Failed to check idempotency key: {}", e.getMessage());
            return false;
        }
    }

    public void revoke(String idempotencyKey) {
        try {
            redisTemplate.delete(IDEMPOTENCY_KEY_PREFIX + idempotencyKey);
        } catch (Exception e) {
            log.error("Failed to revoke idempotency key: {}", e.getMessage());
        }
    }

    public enum IdempotencyResult {
        CLAIMED, REPLAY, CONFLICT
    }

    public IdempotencyResult tryClaim(String scope, String idempotencyKey, UUID resourceId) {
        String redisKey = IDEMPOTENCY_KEY_PREFIX + scope + ":" + idempotencyKey;
        try {
            Boolean claimed = redisTemplate.opsForValue().setIfAbsent(
                    redisKey, resourceId.toString(), TTL_HOURS, TimeUnit.HOURS);
            if (Boolean.TRUE.equals(claimed)) return IdempotencyResult.CLAIMED;
            String existing = redisTemplate.opsForValue().get(redisKey);
            if (resourceId.toString().equals(existing)) return IdempotencyResult.REPLAY;
            return IdempotencyResult.CONFLICT;
        } catch (Exception e) {
            log.error("Idempotency check failed (Redis unavailable): {}", e.getMessage());
            throw new IdempotencyBackendUnavailableException(
                    "Idempotency backend (Redis) is unavailable. Retry shortly.");
        }
    }

    public static class IdempotencyBackendUnavailableException extends RuntimeException {
        public IdempotencyBackendUnavailableException(String message) {
            super(message);
        }
    }

    public record CachedHttpResponse(int status, String contentType, String bodyBase64) {}

    public void storeHttpResponse(String key, int status, String contentType, byte[] body) {
        try {
            CachedHttpResponse cached = new CachedHttpResponse(
                    status, contentType, Base64.getEncoder().encodeToString(body));
            redisTemplate.opsForValue().set(
                    HTTP_RESPONSE_PREFIX + key, objectMapper.writeValueAsString(cached),
                    TTL_HOURS, TimeUnit.HOURS);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize idempotency HTTP response: {}", e.getMessage());
        }
    }

    public CachedHttpResponse getCachedHttpResponse(String key) {
        try {
            String json = redisTemplate.opsForValue().get(HTTP_RESPONSE_PREFIX + key);
            if (json == null) return null;
            return objectMapper.readValue(json, CachedHttpResponse.class);
        } catch (Exception e) {
            log.error("Failed to deserialize idempotency HTTP response: {}", e.getMessage());
            return null;
        }
    }
}
