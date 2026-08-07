package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.AppNotification;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.repository.AppNotificationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.NotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    // Bounds the previously-unbounded GET /api/v1/notifications response -- unread notifications
    // are self-limiting in the common case, but with no cap a stale/abandoned account could return
    // an arbitrarily large payload. Matches UserController's own list-endpoint cap for consistency.
    private static final int MAX_UNREAD_RETURNED = 200;

    private final AppNotificationRepository notificationRepository;
    private final NotificationSseService sseService;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AppNotification> getUnreadForUser(UUID userId, UUID orgId) {
        Pageable cap = PageRequest.of(0, MAX_UNREAD_RETURNED);
        return notificationRepository.findUnreadByUserAndOrg(userId, orgId, cap);
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
    public void dismiss(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (userId.equals(n.getRecipientId()) && !n.isDismissed()) {
                n.setDismissed(true);
                notificationRepository.save(n);
            }
        });
    }

    @Override
    public void snooze(UUID notificationId, UUID userId, Instant until) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (userId.equals(n.getRecipientId())) {
                n.setSnoozedUntil(until);
                notificationRepository.save(n);
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId, UUID orgId) {
        return notificationRepository.countUnreadByUserAndOrg(userId, orgId);
    }

    @Override
    public AppNotification create(UUID recipientId, UUID orgId, NotificationType type, String title, String body) {
        AppNotification saved = notificationRepository.save(AppNotification.builder()
                .recipientId(recipientId)
                .organizationId(orgId)
                .type(type)
                .title(title)
                .body(body)
                .build());
        sseService.publish(saved);
        return saved;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AppNotification createIndependent(UUID recipientId, UUID orgId, NotificationType type, String title, String body) {
        return create(recipientId, orgId, type, title, body);
    }

    @Override
    public void createForUsers(List<UUID> recipientIds, UUID orgId, NotificationType type, String title, String body) {
        recipientIds.forEach(recipientId -> create(recipientId, orgId, type, title, body));
    }

    @Override
    public void createForOrgRole(UUID orgId, String roleName, NotificationType type, String title, String body) {
        List<User> recipients = userRepository.findByOrganizationIdAndRoleName(orgId, roleName);
        if (recipients.isEmpty()) {
            log.debug("No users with role {} in org {} to notify for {}", roleName, orgId, type);
            return;
        }
        recipients.forEach(u -> create(u.getId(), orgId, type, title, body));
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createForOrgRoleIndependent(UUID orgId, String roleName, NotificationType type, String title, String body) {
        createForOrgRole(orgId, roleName, type, title, body);
    }

    @Override
    public void createForPlatformRole(String roleName, NotificationType type, String title, String body) {
        List<User> recipients = userRepository.findDistinctByRoleNameIn(List.of(roleName));
        if (recipients.isEmpty()) {
            log.debug("No platform users with role {} to notify for {}", roleName, type);
            return;
        }
        recipients.forEach(u -> create(u.getId(), null, type, title, body));
    }
}
