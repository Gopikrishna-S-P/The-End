package com.recoverpro.server.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recoverpro.server.common.exception.ErrorResponse;
import com.recoverpro.server.enums.AuditAction;
import com.recoverpro.server.enums.AuditResourceType;
import com.recoverpro.server.enums.AuditResult;
import com.recoverpro.server.service.AuditEventRequest;
import com.recoverpro.server.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Every {@code @PreAuthorize} failure across the app funnels through here -- the one place that
 * can record ACCESS_DENIED without touching every controller. Kept deliberately lightweight: the
 * audit write is best-effort (a broken write must never turn a clean 403 into a 500) and this is
 * the only unified_audit_events call site not behind an explicit business action, so it's the one
 * place worth remembering instruction #13's guidance not to audit every ordinary 403 as equally
 * loud as a real security event -- ACCESS_DENIED defaults to WARNING, not HIGH/CRITICAL.
 */
@Slf4j
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private static final ObjectMapper MAPPER = new ObjectMapper().findAndRegisterModules();

    private final AuditService auditService;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                        AccessDeniedException accessDeniedException) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse body = ErrorResponse.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .error("Forbidden")
                .message("Access denied")
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();
        response.getWriter().write(MAPPER.writeValueAsString(body));
        auditAccessDenied(request);
    }

    private void auditAccessDenied(HttpServletRequest request) {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            String userId = (auth != null && auth.getPrincipal() instanceof UserPrincipal up)
                    ? up.getId().toString() : null;
            auditService.record(AuditEventRequest.builder()
                    .action(AuditAction.ACCESS_DENIED)
                    .resourceType(AuditResourceType.USER)
                    .resourceId(userId)
                    .result(AuditResult.DENIED)
                    .metadata(Map.of("path", request.getRequestURI(), "method", request.getMethod()))
                    .build());
        } catch (Exception e) {
            log.warn("Failed to audit ACCESS_DENIED for {} {}: {}",
                    request.getMethod(), request.getRequestURI(), e.getMessage());
        }
    }
}
