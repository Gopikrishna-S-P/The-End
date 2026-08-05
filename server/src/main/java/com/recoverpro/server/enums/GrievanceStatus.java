package com.recoverpro.server.enums;

/**
 * Lifecycle of a borrower grievance (design spec:
 * docs/superpowers/specs/2026-08-04-grievances-design.md). Values match the pre-existing
 * grievances_status_check constraint (discovered live in the dev DB, never captured in any
 * migration -- brought under Flyway's control in V075, same situation call_logs was in earlier
 * this session).
 *
 *   RECEIVED     -> ACKNOWLEDGED   (receipt confirmed, ack-SLA clock stops)
 *   ACKNOWLEDGED -> INVESTIGATING  (handler assigned, actively worked)
 *                -> ESCALATED      (ownership moves to GRO/manager, before investigation starts)
 *   INVESTIGATING -> ESCALATED
 *                 -> RESOLVED      (outcome recorded, resolution-SLA clock stops)
 *   ESCALATED     -> RESOLVED
 *   RESOLVED      -> CLOSED        (final confirmation)
 *
 * No REJECTED status -- a grievance investigated and found unfounded is still RESOLVED; the
 * outcome goes in resolution_notes. TAT compliance is about responding within SLA, not about
 * the borrower being right.
 */
public enum GrievanceStatus {
    RECEIVED,
    ACKNOWLEDGED,
    INVESTIGATING,
    ESCALATED,
    RESOLVED,
    CLOSED
}
