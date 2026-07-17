package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.AppNotification;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.repository.AppNotificationRepository;
import com.recoverpro.server.service.NotificationService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final AppNotificationRepository notificationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AppNotification> getUnreadForUser(UUID userId, UUID orgId) {
        return notificationRepository.findUnreadByUserAndOrg(userId, orgId);
    }

    @Override
    public void markAllRead(UUID userId, UUID orgId) {
        notificationRepository.markAllReadForUser(userId, orgId);
    }

    @Override
    public void markRead(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (userId.equals(n.getRecipientId()) && n.getReadAt() == null) {
                n.setReadAt(Instant.now());
                notificationRepository.save(n);
            }
        });
    }

    @Override
    public AppNotification create(UUID recipientId, UUID orgId, NotificationType type, String title, String body) {
        return notificationRepository.save(AppNotification.builder()
                .recipientId(recipientId)
                .organizationId(orgId)
                .type(type)
                .title(title)
                .body(body)
                .build());
    }
}
