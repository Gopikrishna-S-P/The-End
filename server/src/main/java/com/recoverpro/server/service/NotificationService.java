package com.recoverpro.server.service;

import com.recoverpro.server.entity.AppNotification;
import com.recoverpro.server.enums.NotificationType;

import java.util.List;
import java.util.UUID;

public interface NotificationService {
    List<AppNotification> getUnreadForUser(UUID userId, UUID orgId);
    void markAllRead(UUID userId, UUID orgId);
    void markRead(UUID notificationId, UUID userId);
    AppNotification create(UUID recipientId, UUID orgId, NotificationType type, String title, String body);
}
