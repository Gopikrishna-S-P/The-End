package com.recoverpro.server.enums;

/** Controlled resource taxonomy for {@code audit_events.resource_type}, so "everything that
 *  happened to resource X" queries don't depend on free-text agreement across call sites. */
public enum AuditResourceType {
    ALLOCATION,
    BORROWER,
    USER,
    ORGANIZATION,
    VISIT,
    COLLECTION,
    PTP,
    SETTLEMENT,
    FILE_UPLOAD,
    ROLE,
    SUBSCRIPTION,
    INVOICE,
    REPORT,
    FEATURE_FLAG,
    CALL_LOG
}
