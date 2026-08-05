package com.recoverpro.server.filter;

import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.IdempotencyKeyService;
import com.recoverpro.server.service.IdempotencyKeyService.CachedHttpResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.util.Set;

/**
 * HTTP-level idempotency replay filter.
 *
 * On first request: wraps the response, lets it through, caches 2xx responses.
 * On replay (same Idempotency-Key): returns the cached status + body without
 * re-executing the handler.
 *
 * Applies only to mutating methods with an Idempotency-Key header.
 * Order 1 — runs after Spring Security's FilterChainProxy (registered at
 * order -100), so SecurityContextHolder is already populated here.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class IdempotencyFilter extends OncePerRequestFilter {

    private static final String IDEMPOTENCY_HEADER = "Idempotency-Key";
    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final IdempotencyKeyService idempotencyKeyService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String method = request.getMethod();
        String rawKey = request.getHeader(IDEMPOTENCY_HEADER);

        if (rawKey == null || rawKey.isBlank() || !MUTATING_METHODS.contains(method)) {
            chain.doFilter(request, response);
            return;
        }

        // Namespace by org+user so two tenants reusing (or guessing) the same client-supplied
        // key can never replay or poison each other's cached response (SEC-PLAN S6).
        String key = namespacedKey(rawKey);

        // Replay path — return cached response without hitting the handler.
        CachedHttpResponse cached = idempotencyKeyService.getCachedHttpResponse(key);
        if (cached != null) {
            log.debug("Idempotency replay: key={}, cachedStatus={}", key, cached.status());
            byte[] body = java.util.Base64.getDecoder().decode(cached.bodyBase64());
            response.setStatus(cached.status());
            if (cached.contentType() != null) response.setContentType(cached.contentType());
            response.setContentLength(body.length);
            response.getOutputStream().write(body);
            return;
        }

        // First-time path — wrap response to capture the body.
        ContentCachingResponseWrapper wrapped = new ContentCachingResponseWrapper(response);
        try {
            chain.doFilter(request, wrapped);
        } finally {
            // Cache only successful responses; let errors pass through uncached.
            int status = wrapped.getStatus();
            if (status >= 200 && status < 300) {
                byte[] body = wrapped.getContentAsByteArray();
                String contentType = wrapped.getContentType();
                idempotencyKeyService.storeHttpResponse(key, status, contentType, body);
                log.debug("Idempotency response cached: key={}, status={}", key, status);
            }
            wrapped.copyBodyToResponse();
        }
    }

    private String namespacedKey(String rawKey) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            Object orgId = principal.getOrganizationId();
            return (orgId != null ? orgId : "platform") + ":" + principal.getId() + ":" + rawKey;
        }
        return "anonymous:" + rawKey;
    }
}
