package com.recoverpro.server.service;

/**
 * Central write path for {@code unified_audit_events} -- auth, RBAC, platform-admin actions,
 * billing, exports, and bulk-import lifecycle stages. Does NOT replace {@link AuditLogService} or
 * {@link UserActionAuditService}: those keep writing to the five existing per-domain audit tables
 * (assignment/collection/ptp/settlement/allocation_audit_logs, user_action_audit_logs) for
 * case-timeline UIs and are unaffected by this facade.
 */
public interface AuditService {

    /**
     * Persists one audit event. Runs in its own transaction (REQUIRES_NEW), same policy as
     * {@code UserActionAuditService.logUserAction} and {@code ComplianceAuditService.record} --
     * an audit record must survive the caller's rollback, and must never silently vanish.
     */
    void record(AuditEventRequest request);
}
