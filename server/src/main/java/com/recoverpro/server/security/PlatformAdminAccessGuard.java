package com.recoverpro.server.security;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.service.UserActionAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * The single sanctioned way to elevate a request past tenant RLS isolation.
 *
 * <p>Platform admins legitimately need to read a tenant's data for support, but in a regulated
 * lending context that access has to be attributable: who looked, whose data, and why. Routing
 * every elevation through here means the audit record is written <em>before</em> the bypass is
 * set, so there is no ordering in which data is readable but unlogged -- callers cannot reach
 * {@link RlsOrgIdHolder#setBypass} without going past the audit write.
 *
 * <p>The audit write runs in its own transaction (see
 * {@code AuditLogServiceImpl#logUserAction}, REQUIRES_NEW), so a request that later fails and
 * rolls back still leaves the access on record.
 */
@Component
@RequiredArgsConstructor
public class PlatformAdminAccessGuard {

    /** Action name recorded in user_action_audit_logs for every cross-tenant read. */
    public static final String CROSS_ORG_ACCESS_ACTION = "PLATFORM_ADMIN_CROSS_ORG_ACCESS";

    private final UserActionAuditService userActionAuditService;

    /**
     * Records the access, then elevates this thread past tenant RLS for the rest of the request.
     *
     * @param adminUserId the platform admin doing the looking -- never a tenant user
     * @param targetOrgId the organization whose data is about to be read
     * @param reason      the caller's stated justification (ticket ref, support case)
     */
    public void beginCrossOrgAccess(UUID adminUserId, UUID targetOrgId, String reason, String resource) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException(
                    "Cross-organization access requires a stated reason. Pass ?reason= with the "
                            + "ticket or support case justifying access to this tenant's data.");
        }
        userActionAuditService.logUserAction(
                adminUserId,
                CROSS_ORG_ACCESS_ACTION,
                "resource=" + resource + "; targetOrganizationId=" + targetOrgId + "; reason=" + reason);
        RlsOrgIdHolder.setBypass(true);
    }

    /**
     * Elevation for non-interactive paths that have no way to collect a reason from the caller.
     *
     * <p>Currently only the SOS audio websocket: the subscribe frame carries no justification
     * field, the target org is unknowable until after the incident lookup that needs the
     * elevation, and demanding a typed justification mid-emergency would add friction to a
     * safety feature. The access is still recorded, and still recorded <em>before</em> any row
     * is read.
     *
     * <p>Whether a supervisor should have to justify listening to another tenant's emergency
     * audio is a product and compliance decision rather than a technical one. If that answer is
     * "yes", this method should be deleted and the callers moved onto
     * {@link #beginCrossOrgAccess}.
     */
    public void beginUnattendedCrossOrgAccess(UUID adminUserId, String resource) {
        userActionAuditService.logUserAction(
                adminUserId,
                CROSS_ORG_ACCESS_ACTION,
                "resource=" + resource + "; reason=<none: non-interactive path>");
        RlsOrgIdHolder.setBypass(true);
    }
}
