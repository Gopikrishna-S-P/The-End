package com.recoverpro.server.enums;

/**
 * Matches the pre-existing grievances_category_check constraint (discovered live in the dev DB --
 * see GrievanceStatus's javadoc).
 */
public enum GrievanceCategory {
    HARASSMENT,
    INCORRECT_INFORMATION,
    RECOVERY_PRACTICE,
    DATA_PRIVACY,
    PAYMENT_DISPUTE,
    OTHER
}
