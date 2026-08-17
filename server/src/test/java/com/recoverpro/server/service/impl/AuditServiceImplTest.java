package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.AuditEvent;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AuditAction;
import com.recoverpro.server.enums.AuditActorType;
import com.recoverpro.server.enums.AuditResourceType;
import com.recoverpro.server.enums.AuditResult;
import com.recoverpro.server.enums.AuditSeverity;
import com.recoverpro.server.enums.AuditSource;
import com.recoverpro.server.repository.AuditEventRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.AuditEventRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuditServiceImplTest {

    @Mock private AuditEventRepository auditEventRepository;

    private AuditServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuditServiceImpl(auditEventRepository);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
        RlsOrgIdHolder.clear();
    }

    @Test
    void record_resolvesActorFromSecurityContext_notCallerInput() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        Role role = new Role();
        role.setName("ROLE_ORG_ADMIN");
        Set<Role> roles = new HashSet<>();
        roles.add(role);
        User user = User.builder().id(userId).organizationId(orgId).roles(roles).enabled(true).build();
        UserPrincipal principal = new UserPrincipal(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        RlsOrgIdHolder.set(orgId);

        // A caller-supplied actor override must be ignored while a real principal is authenticated.
        UUID spoofedActor = UUID.randomUUID();
        service.record(AuditEventRequest.builder()
                .action(AuditAction.ROLE_GRANTED)
                .resourceType(AuditResourceType.USER)
                .resourceId(userId.toString())
                .actorUserIdOverride(spoofedActor)
                .actorTypeOverride(AuditActorType.SYSTEM)
                .build());

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent saved = captor.getValue();

        assertThat(saved.getActorUserId()).isEqualTo(userId);
        assertThat(saved.getActorType()).isEqualTo(AuditActorType.USER);
        assertThat(saved.getActorRole()).contains("ROLE_ORG_ADMIN");
        assertThat(saved.getOrganizationId()).isEqualTo(orgId);
        assertThat(saved.getEffectiveUserId()).isEqualTo(userId);
        assertThat(saved.getSeverity()).isEqualTo(AuditSeverity.HIGH); // ROLE_GRANTED's default
        assertThat(saved.getResult()).isEqualTo(AuditResult.SUCCESS);
    }

    @Test
    void record_withNoSecurityContext_usesOverridesForBackgroundWork() {
        UUID orgId = UUID.randomUUID();
        UUID uploaderId = UUID.randomUUID();
        RlsOrgIdHolder.set(orgId);

        service.record(AuditEventRequest.builder()
                .action(AuditAction.FILE_PROCESSING_COMPLETED)
                .resourceType(AuditResourceType.FILE_UPLOAD)
                .actorUserIdOverride(uploaderId)
                .actorTypeOverride(AuditActorType.BACKGROUND_JOB)
                .build());

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent saved = captor.getValue();

        assertThat(saved.getActorUserId()).isEqualTo(uploaderId);
        assertThat(saved.getActorType()).isEqualTo(AuditActorType.BACKGROUND_JOB);
        assertThat(saved.getSource()).isEqualTo(AuditSource.BACKGROUND_JOB);
        assertThat(saved.getOrganizationId()).isEqualTo(orgId);
    }

    @Test
    void record_organizationIdOverride_winsOverRlsOrgIdHolder() {
        UUID sessionOrg = UUID.randomUUID();
        UUID targetOrg = UUID.randomUUID();
        RlsOrgIdHolder.set(sessionOrg);

        service.record(AuditEventRequest.builder()
                .action(AuditAction.ORG_SUSPENDED)
                .resourceType(AuditResourceType.ORGANIZATION)
                .resourceId(targetOrg.toString())
                .organizationIdOverride(targetOrg)
                .build());

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        assertThat(captor.getValue().getOrganizationId()).isEqualTo(targetOrg);
        assertThat(captor.getValue().getSeverity()).isEqualTo(AuditSeverity.CRITICAL);
    }
}
