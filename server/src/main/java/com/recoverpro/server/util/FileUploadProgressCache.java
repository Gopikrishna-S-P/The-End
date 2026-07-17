package com.recoverpro.server.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class FileUploadProgressCache {

    private static final String KEY_PREFIX = "file:progress:";
    private static final Duration TTL = Duration.ofHours(24);

    private final RedisTemplate<String, Object> redisTemplate;

    public void setProgress(UUID fileUploadId, int processedRows, int totalRows) {
        double percentage = totalRows == 0 ? 0.0 : (processedRows * 100.0) / totalRows;
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + fileUploadId,
                    new ProgressEntry(processedRows, totalRows, percentage), TTL);
        } catch (Exception e) {
            log.warn("Failed to cache upload progress for {}: {}", fileUploadId, e.getMessage());
        }
    }

    public ProgressEntry getProgress(UUID fileUploadId) {
        try {
            Object value = redisTemplate.opsForValue().get(KEY_PREFIX + fileUploadId);
            if (value instanceof ProgressEntry entry) return entry;
        } catch (Exception e) {
            log.warn("Failed to retrieve upload progress for {}: {}", fileUploadId, e.getMessage());
        }
        return null;
    }

    public void evict(UUID fileUploadId) {
        try {
            redisTemplate.delete(KEY_PREFIX + fileUploadId);
        } catch (Exception e) {
            log.warn("Failed to evict upload progress for {}: {}", fileUploadId, e.getMessage());
        }
    }

    public record ProgressEntry(int processedRows, int totalRows, double percentage) {}
}
