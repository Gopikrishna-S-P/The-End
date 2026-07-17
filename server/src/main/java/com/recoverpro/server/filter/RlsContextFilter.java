package com.recoverpro.server.filter;

import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Registered as a plain servlet-container filter (like IdempotencyFilter),
 * so it runs after Spring Security's own internal chain (FilterChainProxy is
 * registered at order -100) has already authenticated the request — the
 * SecurityContext is populated by the time this filter reads it, and it
 * runs before the DispatcherServlet dispatches to any controller/repository
 * call, so RlsOrgIdHolder is always set before RlsAwareDataSource needs it.
 */
@Component
@Order(2)
public class RlsContextFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
                RlsOrgIdHolder.set(principal.getOrganizationId());
            }
            chain.doFilter(request, response);
        } finally {
            RlsOrgIdHolder.clear();
        }
    }
}
