package com.recoverpro.server.enums;

/** Outcome of the audited operation. DENIED is kept distinct from FAILURE so authorization
 *  failures can be isolated from ordinary business-rule failures in security queries. */
public enum AuditResult {
    SUCCESS,
    FAILURE,
    DENIED,
    PARTIAL
}
