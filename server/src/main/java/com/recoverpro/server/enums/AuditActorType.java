package com.recoverpro.server.enums;

/** Kind of actor behind an {@code audit_events} row. Resolved from server-side security context
 *  (SecurityContextHolder / UserPrincipal) for USER rows, or from the calling job/service for
 *  SYSTEM and BACKGROUND_JOB rows -- never caller-supplied. No external integrations issue calls
 *  yet; API_CLIENT is reserved for when one does. */
public enum AuditActorType {
    USER,
    SYSTEM,
    BACKGROUND_JOB,
    API_CLIENT
}
