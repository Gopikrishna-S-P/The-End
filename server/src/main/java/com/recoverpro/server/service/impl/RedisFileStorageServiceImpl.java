package com.recoverpro.server.service.impl;

import com.recoverpro.server.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisFileStorageServiceImpl implements FileStorageService {

    @Qualifier("byteArrayRedisTemplate")
    private final RedisTemplate<String, byte[]> redisTemplate;

    private static final String KEY_PREFIX = "file:upload:";
    private static final long TTL_HOURS = 24;

    @Override
    public void store(UUID fileUploadId, MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String key = KEY_PREFIX + fileUploadId;
            redisTemplate.opsForValue().set(key, bytes, TTL_HOURS, TimeUnit.HOURS);
            log.info("Stored {} bytes for fileUploadId {} in Redis", bytes.length, fileUploadId);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file bytes for storage: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] retrieve(UUID fileUploadId) {
        String key = KEY_PREFIX + fileUploadId;
        byte[] bytes = redisTemplate.opsForValue().get(key);
        log.debug("Retrieved {} bytes for fileUploadId {}", bytes != null ? bytes.length : 0, fileUploadId);
        return bytes;
    }

    @Override
    public void delete(UUID fileUploadId) {
        redisTemplate.delete(KEY_PREFIX + fileUploadId);
        log.info("Deleted file from Redis storage for fileUploadId {}", fileUploadId);
    }
}
