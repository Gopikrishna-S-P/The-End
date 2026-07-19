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
     * GUC, which individual RLS policies can opt into (see V050 for file_uploads). Set only by
     * server-side code that has already verified the caller is PLATFORM_ADMIN and is deliberately
     * acting on another org's data (e.g. an explicit organizationId override), never from request
     * input directly.
     */
    public static void setBypass(boolean bypass) { BYPASS.set(bypass); }
    public static boolean isBypass()              { return Boolean.TRUE.equals(BYPASS.get()); }

    public static void clear() {
        ORG_ID.remove();
        BYPASS.remove();
    }
}
