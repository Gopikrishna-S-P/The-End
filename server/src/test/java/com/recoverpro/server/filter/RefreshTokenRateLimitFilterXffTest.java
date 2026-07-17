package com.recoverpro.server.filter;

import com.recoverpro.server.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenRateLimitFilterXffTest extends AbstractIntegrationTest {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @BeforeEach
    void clearRateLimitBuckets() {
        Set<String> keys = redisTemplate.keys("rate:refresh:*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }

    @Test
    void spoofedXffCannotEvadeRateLimit() {
        ResponseEntity<String> last = null;
        for (int i = 0; i < 11; i++) {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Forwarded-For", "203.0.113." + i);
            HttpEntity<String> request = new HttpEntity<>("{\"refreshToken\":\"bogus-token\"}", headers);
            last = restTemplate.postForEntity(baseUrl("/api/v1/auth/refresh"), request, String.class);
        }

        assertThat(last.getStatusCode().value())
                .as("11th refresh attempt from the same real client, each with a distinct spoofed X-Forwarded-For, must still be rate-limited")
                .isEqualTo(429);
    }
}
