package com.recoverpro.server.service.ai;

import com.recoverpro.server.common.exception.RateLimitExceededException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers both the original chat limiter and the ambient-mode limiter added alongside it
 * (final-review finding 4b) -- the two must use distinct Redis key prefixes and distinct,
 * independently-configured limits so a normal high-frequency ambient conversation doesn't
 * trip the much stricter typed-chat limit.
 */
@ExtendWith(MockitoExtension.class)
class ChatRateLimiterTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    private ChatRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new ChatRateLimiter(redisTemplate);
        ReflectionTestUtils.setField(rateLimiter, "maxRequests", 20);
        ReflectionTestUtils.setField(rateLimiter, "windowSeconds", 60L);
        ReflectionTestUtils.setField(rateLimiter, "ambientMaxRequests", 120);
        ReflectionTestUtils.setField(rateLimiter, "ambientWindowSeconds", 60L);
    }

    @Test
    void checkAndRecord_underLimit_doesNotThrow() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any())).thenReturn(5L);

        assertThatCode(() -> rateLimiter.checkAndRecord(UUID.randomUUID())).doesNotThrowAnyException();
    }

    @Test
    void checkAndRecord_overChatLimit_throwsRateLimitExceeded() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any())).thenReturn(21L);
        when(redisTemplate.getExpire(any())).thenReturn(45L);

        assertThatThrownBy(() -> rateLimiter.checkAndRecord(UUID.randomUUID()))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void checkAndRecordAmbient_at100Requests_staysUnderAmbientLimitEvenThoughOverChatLimit() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any())).thenReturn(100L);

        // 100 requests/window would exceed the default chat limit (20) but must not trip the
        // separate, more generous ambient limit (120) -- this is the whole point of finding 4b.
        assertThatCode(() -> rateLimiter.checkAndRecordAmbient(UUID.randomUUID())).doesNotThrowAnyException();
    }

    @Test
    void checkAndRecordAmbient_overAmbientLimit_throwsRateLimitExceeded() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any())).thenReturn(121L);
        when(redisTemplate.getExpire(any())).thenReturn(30L);

        assertThatThrownBy(() -> rateLimiter.checkAndRecordAmbient(UUID.randomUUID()))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void checkAndRecordAmbient_usesDistinctRedisKeyPrefixFromChat() {
        UUID agentId = UUID.randomUUID();
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any())).thenReturn(1L);

        rateLimiter.checkAndRecordAmbient(agentId);

        ArgumentCaptor<List> keysCaptor = ArgumentCaptor.forClass(List.class);
        verify(redisTemplate).execute(any(RedisScript.class), keysCaptor.capture(), any());
        assertThat(keysCaptor.getValue()).hasSize(1);
        assertThat(keysCaptor.getValue().get(0).toString())
                .startsWith("rate:ambient:")
                .doesNotContain("rate:chat:");
    }

    @Test
    void checkAndRecord_redisError_failsClosedWithRateLimitExceeded() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any()))
                .thenThrow(new RuntimeException("Redis connection refused"));

        assertThatThrownBy(() -> rateLimiter.checkAndRecord(UUID.randomUUID()))
                .isInstanceOf(RateLimitExceededException.class);
    }
}
