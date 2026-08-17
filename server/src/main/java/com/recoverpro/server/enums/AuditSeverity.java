package com.recoverpro.server.enums;

/** Severity of an {@code audit_events} row. Kept to four levels so CRITICAL stays meaningful --
 *  see AuditAction for the default-severity-per-action mapping. */
public enum AuditSeverity {
    INFO,
    WARNING,
    HIGH,
    CRITICAL
}
