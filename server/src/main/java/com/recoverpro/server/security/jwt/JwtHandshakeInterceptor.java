package com.recoverpro.server.security.jwt;

import com.recoverpro.server.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Validates a JWT on every WebSocket handshake before the connection is upgraded.
 * Browsers cannot set custom headers on a WS upgrade, so the token is accepted
 * either via {@code Authorization: Bearer <jwt>} (for native clients) or
 * {@code ?token=<jwt>} query parameter (for browsers). On success the resolved
 * {@link UserPrincipal} is stashed in {@code session.getAttributes()} so the
 * message handlers can enforce per-message authorization without re-validating.
 *
 * <p>Unauthenticated handshakes are rejected with 401 — the handler never sees
 * the connection. Blacklisted (logged-out) tokens are also rejected.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String PRINCIPAL_ATTR    = "principal";
    public static final String TOKEN_EXPIRY_ATTR = "tokenExpiryMs";

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final StringRedisTemplate redisTemplate;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String token = extractToken(request);
        if (!StringUtils.hasText(token)) {
            return reject(response, "Missing token on WebSocket handshake");
        }
        if (!jwtTokenProvider.validateToken(token)) {
            return reject(response, "Invalid or expired token on WebSocket handshake");
        }
        if (isBlacklisted(token)) {
            return reject(response, "Blacklisted token on WebSocket handshake");
        }
        try {
            String username = jwtTokenProvider.extractUsername(token);
            Object userDetails = userDetailsService.loadUserByUsername(username);
            if (!(userDetails instanceof UserPrincipal principal)) {
                return reject(response, "Unexpected UserDetails type for WebSocket handshake");
            }
            attributes.put(PRINCIPAL_ATTR, principal);
            attributes.put(TOKEN_EXPIRY_ATTR, jwtTokenProvider.extractExpiration(token).getTime());
            return true;
        } catch (Exception e) {
            log.warn("WebSocket handshake auth failed: {}", e.getMessage());
            return reject(response, "Handshake authentication failed");
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }

    private boolean reject(ServerHttpResponse response, String reason) {
        log.warn(reason);
        if (response instanceof ServletServerHttpResponse servletResp) {
            servletResp.getServletResponse().setStatus(HttpStatus.UNAUTHORIZED.value());
        } else {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
        }
        return false;
    }

    private String extractToken(ServerHttpRequest request) {
        String header = request.getHeaders().getFirst("Authorization");
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        if (request instanceof ServletServerHttpRequest servletReq) {
            String q = servletReq.getServletRequest().getParameter("token");
            if (StringUtils.hasText(q)) return q;
        }
        return null;
    }

    private boolean isBlacklisted(String token) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
        } catch (Exception e) {
            // Match JwtAuthenticationFilter: fail closed when Redis is unreachable so
            // logged-out tokens can never be replayed via WebSocket.
            log.warn("Redis blacklist check failed on WS handshake; rejecting token: {}", e.getMessage());
            return true;
        }
    }
}
