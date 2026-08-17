package com.recoverpro.server.enums;

/** Where an audited operation originated. Resolved server-side from the auth/request context --
 *  never accepted as caller input. */
public enum AuditSource {
    WEB,
    MOBILE,
    API,
    ADMIN_CONSOLE,
    SYSTEM,
    BACKGROUND_JOB
}
