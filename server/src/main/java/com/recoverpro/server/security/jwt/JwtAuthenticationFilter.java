package com.recoverpro.server.security.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX    = "Bearer ";
    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final StringRedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);

        if (!StringUtils.hasText(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!jwtTokenProvider.validateToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        BlacklistCheck blacklistCheck = checkBlacklist(token);
        if (blacklistCheck == BlacklistCheck.CHECK_FAILED) {
            log.error("JWT revocation check unavailable (Redis error) - failing closed, rejecting request from {}",
                    clientIp(request));
            writeServiceUnavailable(response, "Unable to verify token status. Retry shortly.");
            return;
        }
        if (blacklistCheck == BlacklistCheck.BLACKLISTED) {
            log.warn("Blocked request with blacklisted JWT from {}", clientIp(request));
            writeUnauthorized(response, "Token has been revoked");
            return;
        }

        try {
            String username = jwtTokenProvider.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            var authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);

            filterChain.doFilter(request, response);

        } catch (UsernameNotFoundException e) {
            log.warn("User not found for token: {}", e.getMessage());
            writeUnauthorized(response, "Invalid credentials");
        } catch (Exception e) {
            log.error("Authentication error from {}: {}", clientIp(request), e.getMessage(), e);
            if (!response.isCommitted()) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Authentication processing failed\",\"status\":500}");
            }
        }
    }

    // Browser EventSource cannot set custom headers, so the SSE notification stream is the one
    // endpoint that accepts a token via query param instead of the Authorization header. Scoped
    // narrowly to that single path so no other endpoint's tokens end up in access logs/proxies.
    private static final String SSE_STREAM_PATH = "/api/v1/notifications/stream";

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        if (SSE_STREAM_PATH.equals(request.getRequestURI())) {
            String queryToken = request.getParameter("token");
            if (StringUtils.hasText(queryToken)) {
                return queryToken;
            }
        }
        return null;
    }

    private enum BlacklistCheck { CLEAR, BLACKLISTED, CHECK_FAILED }

    private BlacklistCheck checkBlacklist(String token) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token))
                    ? BlacklistCheck.BLACKLISTED
                    : BlacklistCheck.CLEAR;
        } catch (Exception e) {
            log.error("Redis blacklist check failed: {}", e.getMessage());
            return BlacklistCheck.CHECK_FAILED;
        }
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        if (!response.isCommitted()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"" + message + "\",\"status\":401}");
        }
    }

    private void writeServiceUnavailable(HttpServletResponse response, String message) throws IOException {
        if (!response.isCommitted()) {
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"" + message + "\",\"status\":503}");
        }
    }

    private String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
