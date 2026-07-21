package com.recoverpro.server.security;

import java.util.UUID;

public final class RlsOrgIdHolder {

    private static final ThreadLocal<UUID> ORG_ID = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> BYPASS = new ThreadLocal<>();

    private RlsOrgIdHolder() {}

    public static void set(UUID orgId)  { ORG_ID.set(orgId); }
    public static UUID get()            { return ORG_ID.get(); }

    /**
     * Marks the current thread's connection checkouts as platform-admin-privileged for the rest
     * of this request -- RlsAwareDataSource stamps this onto the app.is_platform_admin session
     * GUC, which individual RLS policies can opt into (see V050 for file_uploads).
     *
     * <p>Deliberately package-private: elevation must go through {@link PlatformAdminAccessGuard},
     * which records who is reading whose data before the bypass takes effect. Making this public
     * again would let a caller read across tenants with nothing on record -- which is exactly how
     * the file_uploads, message_templates and incident_reports bypasses went unlogged.
     */
    static void setBypass(boolean bypass) { BYPASS.set(bypass); }
    public static boolean isBypass()              { return Boolean.TRUE.equals(BYPASS.get()); }

    public static void clear() {
        ORG_ID.remove();
        BYPASS.remove();
    }
}
