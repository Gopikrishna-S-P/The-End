package com.recoverpro.server.service;

import com.recoverpro.server.enums.AuditAction;
import com.recoverpro.server.enums.AuditActorType;
import com.recoverpro.server.enums.AuditResourceType;
import com.recoverpro.server.enums.AuditResult;
import com.recoverpro.server.enums.AuditSource;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;
import java.util.UUID;

/**
 * Content a caller supplies to {@link AuditService#record}. Trust-sensitive fields (actor,
 * organization, request id, IP, user agent) are deliberately NOT here as required input --
 * {@code AuditServiceImpl} resolves those from server-side context (SecurityContextHolder,
 * RlsOrgIdHolder, MDC) so a caller can never spoof who performed an action.
 * <p>
 * The override fields below exist only for the two cases where server-side context genuinely
 * doesn't have the answer: async/background work (no SecurityContext on the executor thread --
 * see AsyncConfig's task decorator, which propagates RlsOrgIdHolder and MDC but not the security
 * principal) and platform-admin actions targeting a different org than the admin's own session
 * context.
 */
@Getter
@Builder
public class AuditEventRequest {

    private final AuditAction action;
    private final AuditResourceType resourceType;
    private final String resourceId;

    @Builder.Default
    private final AuditResult result = AuditResult.SUCCESS;

    private final String reason;
    private final Map<String, Object> beforeState;
    private final Map<String, Object> afterState;
    private final Map<String, Object> metadata;
    private final String correlationId;

    /** Only for async/background work with no SecurityContext -- e.g. the user who uploaded a
     *  file, read off the FileUpload entity, so the audit trail still names a person even though
     *  the processing itself runs on a job thread. */
    private final UUID actorUserIdOverride;

    /** Only for SYSTEM/BACKGROUND_JOB events with no authenticated user at all (webhook handlers,
     *  scheduled jobs). Leave null for ordinary user-initiated actions -- the service infers USER
     *  from SecurityContextHolder. */
    private final AuditActorType actorTypeOverride;

    /** Only when the action concerns a different org than the caller's own session context --
     *  e.g. a platform admin suspending a tenant org while their own context is null. Leave null
     *  to use RlsOrgIdHolder.get(). */
    private final UUID organizationIdOverride;

    private final AuditSource sourceOverride;
}
