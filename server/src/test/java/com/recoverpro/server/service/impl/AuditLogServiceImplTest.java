package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.response.AuditLogResponse;
import com.recoverpro.server.dto.response.UserActionAuditResponse;
import com.recoverpro.server.entity.AssignmentAuditLog;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.UserActionAuditLog;
import com.recoverpro.server.repository.AssignmentAuditLogRepository;
import com.recoverpro.server.repository.UserActionAuditLogRepository;
import com.recoverpro.server.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceImplTest {

    @Mock private AssignmentAuditLogRepository auditLogRepository;
    @Mock private UserActionAuditLogRepository userActionAuditLogRepository;
    @Mock private UserRepository userRepository;

    private AuditLogServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuditLogServiceImpl(auditLogRepository, userActionAuditLogRepository, userRepository);
    }

    @Test
    void getLogsByOrganization_batchesActorLookup_insteadOfPerEntry() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        User a = User.builder().id(userA).firstName("Ann").lastName("A").build();
        User b = User.builder().id(userB).firstName("Ben").lastName("B").build();

        AssignmentAuditLog e1 = AssignmentAuditLog.builder().id(UUID.randomUUID()).performedBy(userA).build();
        AssignmentAuditLog e2 = AssignmentAuditLog.builder().id(UUID.randomUUID()).performedBy(userB).build();
        AssignmentAuditLog e3 = AssignmentAuditLog.builder().id(UUID.randomUUID()).performedBy(userA).build();

        Pageable pageable = PageRequest.of(0, 20);
        Page<AssignmentAuditLog> page = new PageImpl<>(List.of(e1, e2, e3), pageable, 3);
        UUID orgId = UUID.randomUUID();
        when(auditLogRepository.findByOrganizationId(orgId, pageable)).thenReturn(page);
        when(userRepository.findAllById(any())).thenReturn(List.of(a, b));

        Page<AuditLogResponse> result = service.getLogsByOrganization(orgId, pageable);

        assertThat(result.getContent()).hasSize(3);
        assertThat(result.getContent().get(0).getPerformedByName()).isEqualTo("Ann A");
        verify(userRepository, times(1)).findAllById(any());
        verify(userRepository, never()).findById(any());
    }

    @Test
    void getAllUserActionLogs_batchesActorLookup_insteadOfPerEntry() {
        UUID userA = UUID.randomUUID();
        User a = User.builder().id(userA).email("ann@example.com").build();

        UserActionAuditLog e1 = UserActionAuditLog.builder().id(UUID.randomUUID()).userId(userA).build();
        UserActionAuditLog e2 = UserActionAuditLog.builder().id(UUID.randomUUID()).userId(userA).build();

        Pageable pageable = PageRequest.of(0, 20);
        Page<UserActionAuditLog> page = new PageImpl<>(List.of(e1, e2), pageable, 2);
        when(userActionAuditLogRepository.findAllByOrderByCreatedAtDesc(pageable)).thenReturn(page);
        when(userRepository.findAllById(any())).thenReturn(List.of(a));

        Page<UserActionAuditResponse> result = service.getAllUserActionLogs(pageable);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).getUserEmail()).isEqualTo("ann@example.com");
        verify(userRepository, times(1)).findAllById(any());
        verify(userRepository, never()).findById(any());
    }
}
