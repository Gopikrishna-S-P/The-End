package com.recoverpro.server.enums;

/**
 * Controlled action taxonomy for {@code audit_events}. Each action carries its own default
 * severity so severity isn't set ad hoc per call site.
 * <p>
 * This enum intentionally does NOT cover the business actions that already live on the five
 * existing per-domain audit tables (assignment_audit_logs, collection_audit_logs, ptp_audit_logs,
 * settlement_audit_logs, allocation_audit_logs) -- those keep their existing free-text action
 * columns and call sites unchanged. This taxonomy only covers categories that previously had no
 * controlled taxonomy at all: auth, RBAC, user lifecycle, platform admin, billing, bulk-import
 * lifecycle, and reports/export.
 * <p>
 * The DB CHECK constraint on {@code audit_events.action} (V085) must be kept in sync with this
 * enum by hand -- same convention already used for {@code report_jobs.report_type} (see V064).
 */
public enum AuditAction {

    // Auth
    AUTH_LOGIN_SUCCESS(AuditSeverity.INFO),
    AUTH_LOGIN_FAILED(AuditSeverity.WARNING),
    AUTH_LOGOUT(AuditSeverity.INFO),
    AUTH_PASSWORD_CHANGED(AuditSeverity.HIGH),
    AUTH_PASSWORD_RESET_REQUESTED(AuditSeverity.WARNING),
    AUTH_PASSWORD_RESET_COMPLETED(AuditSeverity.HIGH),
    AUTH_MFA_ENABLED(AuditSeverity.HIGH),
    AUTH_MFA_DISABLED(AuditSeverity.HIGH),
    AUTH_SESSION_REVOKED(AuditSeverity.WARNING),
    AUTH_TOKEN_THEFT_DETECTED(AuditSeverity.CRITICAL),

    // RBAC
    ROLE_GRANTED(AuditSeverity.HIGH),
    ROLE_REVOKED(AuditSeverity.HIGH),
    PERMISSION_GRANTED(AuditSeverity.HIGH),
    PERMISSION_REVOKED(AuditSeverity.HIGH),
    ACCESS_DENIED(AuditSeverity.WARNING),

    // User lifecycle
    USER_CREATED(AuditSeverity.INFO),
    USER_UPDATED(AuditSeverity.INFO),
    USER_DEACTIVATED(AuditSeverity.HIGH),
    USER_REACTIVATED(AuditSeverity.HIGH),
    USER_ROLE_CHANGED(AuditSeverity.HIGH),

    // Platform admin
    ORG_SUSPENDED(AuditSeverity.CRITICAL),
    ORG_REACTIVATED(AuditSeverity.HIGH),
    ORG_TRIAL_EXTENDED(AuditSeverity.INFO),
    ENTITLEMENT_GRANTED(AuditSeverity.HIGH),
    ENTITLEMENT_REVOKED(AuditSeverity.HIGH),
    CROSS_ORG_ACCESS(AuditSeverity.HIGH),
    FEATURE_FLAG_CHANGED(AuditSeverity.WARNING),

    // Billing
    SUBSCRIPTION_CREATED(AuditSeverity.INFO),
    SUBSCRIPTION_CHANGED(AuditSeverity.HIGH),
    SUBSCRIPTION_CANCELLED(AuditSeverity.HIGH),
    INVOICE_PAYMENT_FAILED(AuditSeverity.WARNING),
    REFUND_CREATED(AuditSeverity.HIGH),
    BILLING_OVERRIDE_APPLIED(AuditSeverity.CRITICAL),

    // Bulk-import lifecycle
    FILE_UPLOAD_INITIATED(AuditSeverity.INFO),
    FILE_PROCESSING_STARTED(AuditSeverity.INFO),
    FILE_PROCESSING_COMPLETED(AuditSeverity.INFO),
    FILE_PROCESSING_PARTIALLY_FAILED(AuditSeverity.WARNING),
    FILE_PROCESSING_FAILED(AuditSeverity.WARNING),
    FILE_UPLOAD_DELETED(AuditSeverity.WARNING),

    // Reports & export
    REPORT_GENERATED(AuditSeverity.INFO),
    REPORT_EXPORTED(AuditSeverity.INFO),
    DATA_EXPORTED(AuditSeverity.HIGH),
    AUDIT_LOG_EXPORTED(AuditSeverity.HIGH);

    private final AuditSeverity defaultSeverity;

    AuditAction(AuditSeverity defaultSeverity) {
        this.defaultSeverity = defaultSeverity;
    }

    public AuditSeverity defaultSeverity() {
        return defaultSeverity;
    }
}
