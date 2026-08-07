package com.recoverpro.server.service;

import com.recoverpro.server.entity.AppNotification;
import com.recoverpro.server.enums.NotificationType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface NotificationService {
    List<AppNotification> getUnreadForUser(UUID userId, UUID orgId);
    void markAllRead(UUID userId, UUID orgId);
    void markRead(UUID notificationId, UUID userId);
    void dismiss(UUID notificationId, UUID userId);
    void snooze(UUID notificationId, UUID userId, Instant until);
    long getUnreadCount(UUID userId, UUID orgId);
    AppNotification create(UUID recipientId, UUID orgId, NotificationType type, String title, String body);

    /**
     * Like create, but runs in its own transaction (REQUIRES_NEW) so it gets a fresh connection
     * checkout -- needed when the caller's own transaction already has a stale/mismatched
     * app.current_org_id baked into its connection from an earlier query (e.g. login/refresh,
     * where no JWT exists yet to establish RLS org context before the first DB call happens).
     */
    AppNotification createIndependent(UUID recipientId, UUID orgId, NotificationType type, String title, String body);

    /** Fires one notification per recipient id, all scoped to the same org. */
    void createForUsers(List<UUID> recipientIds, UUID orgId, NotificationType type, String title, String body);

    /** Notifies every user holding roleName within orgId (e.g. all ROLE_TL in an org). */
    void createForOrgRole(UUID orgId, String roleName, NotificationType type, String title, String body);

    /**
     * Like createForOrgRole, but runs in its own transaction so the notification survives even
     * when the caller's transaction is about to roll back (e.g. recording a blocked compliance
     * violation right before throwing) -- mirrors ComplianceAuditService.record's REQUIRES_NEW.
     */
    void createForOrgRoleIndependent(UUID orgId, String roleName, NotificationType type, String title, String body);

    /** Notifies every user holding roleName platform-wide (e.g. all ROLE_PLATFORM_ADMIN). Stored with a null org id. */
    void createForPlatformRole(String roleName, NotificationType type, String title, String body);
}
