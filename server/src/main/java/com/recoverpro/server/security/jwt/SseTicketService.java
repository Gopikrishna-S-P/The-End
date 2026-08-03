package com.recoverpro.server.security.jwt;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collections;
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

    // GET+DEL as a single Lua script, not GETDEL: two concurrent redemptions of the same ticket (a
    // replay attempt landing in the same instant as the legitimate one) could otherwise both read the
    // value before either deleted it, defeating the single-use guarantee this class exists for. A
    // script is atomic on any Redis since 2.6 -- GETDEL itself needs 6.2+, which not every deployment
    // target (older managed instances, this project's own Windows dev sandbox) provides.
    private static final RedisScript<String> GET_AND_DELETE = new DefaultRedisScript<>(
            "local v = redis.call('GET', KEYS[1]) if v then redis.call('DEL', KEYS[1]) end return v",
            String.class);

    private final StringRedisTemplate redisTemplate;

    public String issueTicket(String username) {
        String ticket = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(PREFIX + ticket, username, TICKET_TTL);
        return ticket;
    }

    /** Returns the username the ticket was issued for, or null if invalid/expired/already used. */
    public String redeemTicket(String ticket) {
        return redisTemplate.execute(GET_AND_DELETE, Collections.singletonList(PREFIX + ticket));
    }
}
