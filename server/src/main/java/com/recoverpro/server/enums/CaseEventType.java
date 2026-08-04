package com.recoverpro.server.enums;

/**
 * Mirrors the frontend's CaseEventType union (web/src/types/collections.ts).
 * Not every value is currently emitted by CaseTimelineServiceImpl -- some
 * (NPA_FLAG_RAISED, COOLING_OFF_STARTED, COMMUNICATION_*, PTP_RESCHEDULED,
 * ASSIGNMENT_COMPLETED) have no backing audit trail yet, so they're kept
 * here for contract parity but never produced until that data exists.
 * ALLOCATION_STATUS_CHANGED and ALLOCATION_DISPOSITION_CHANGED ARE backed,
 * by allocation_audit_logs (see AllocationAuditLog). SETTLEMENT_OFFERED/
 * ACCEPTED/DECLINED are backed by settlement_audit_logs, added alongside
 * the settlement_offers feature (2026-08-04). GRIEVANCE_RAISED/RESOLVED are
 * backed directly by grievances rows (no separate audit table -- see
 * GrievanceServiceImpl), added alongside the grievances feature (2026-08-04),
 * and only emitted for grievances with a non-null allocation_id.
 */
public enum CaseEventType {
    ALLOCATION_CREATED,
    ALLOCATION_STATUS_CHANGED,
    ALLOCATION_DISPOSITION_CHANGED,
    ALLOCATION_CLOSED,
    NPA_FLAG_RAISED,
    COOLING_OFF_STARTED,

    ASSIGNMENT_CREATED,
    ASSIGNMENT_REASSIGNED,
    ASSIGNMENT_CANCELLED,
    ASSIGNMENT_COMPLETED,

    VISIT_LOGGED,
    VISIT_APPROVED,
    VISIT_REJECTED,

    PTP_CREATED,
    PTP_FULFILLED,
    PTP_PARTIALLY_FULFILLED,
    PTP_BROKEN,
    PTP_CANCELLED,
    PTP_RESCHEDULED,

    COLLECTION_SUBMITTED,
    COLLECTION_APPROVED,
    COLLECTION_REJECTED,
    COLLECTION_DEPOSITED,
    COLLECTION_CANCELLED,

    COMMUNICATION_SENT,
    COMMUNICATION_SUPPRESSED,
    COMMUNICATION_FAILED,

    RESTRUCTURE_PROPOSED,
    RESTRUCTURE_APPROVED,
    RESTRUCTURE_REJECTED,
    SETTLEMENT_OFFERED,
    SETTLEMENT_ACCEPTED,
    SETTLEMENT_DECLINED,

    GRIEVANCE_RAISED,
    GRIEVANCE_RESOLVED,
}
