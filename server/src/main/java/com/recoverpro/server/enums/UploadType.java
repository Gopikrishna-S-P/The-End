package com.recoverpro.server.enums;

/**
 * Identifies which domain entity a file upload populates. ALLOCATION is the original
 * (and only) behaviour of the upload pipeline; the rest were added to let orgs backfill
 * historical records that predate their onboarding.
 */
public enum UploadType {
    ALLOCATION, COLLECTION, VISIT, PTP
}
