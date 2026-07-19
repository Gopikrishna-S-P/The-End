package com.recoverpro.server.security.jwt;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

/**
 * Short-lived, single-use tickets for the SSE notification stream. Browser EventSource can't set
 * an Authorization header, so the stream URL needs *something* in its query string -- but a raw
 * JWT there would sit in access logs, proxy logs, and browser history for as long as the token is
 * valid. A ticket is a random opaque value, valid for {@link #TICKET_TTL}, consumed on first use,
 * and reveals nothing on its own (it maps to a username only inside Redis).
 */
@Component
@RequiredArgsConstructor
public class SseTicketService {

    private static final String PREFIX = "sse:ticket:";
    private static final Duration TICKET_TTL = Duration.ofSeconds(30);

    private final StringRedisTemplate redisTemplate;

    public String issueTicket(String username) {
        String ticket = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(PREFIX + ticket, username, TICKET_TTL);
        return ticket;
    }

    /** Returns the username the ticket was issued for, or null if invalid/expired/already used. */
    public String redeemTicket(String ticket) {
        String key = PREFIX + ticket;
        String username = redisTemplate.opsForValue().get(key);
        if (username != null) {
            redisTemplate.delete(key);
        }
        return username;
    }
}
