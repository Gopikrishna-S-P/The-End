package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.MessageTemplate;
import com.recoverpro.server.enums.Channel;
import com.recoverpro.server.enums.MessageTemplateStatus;
import com.recoverpro.server.repository.MessageTemplateRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.compliance.TemplateAbuseLinter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Covers the gap found during the API audit: activate/submitForDlt/retire all skipped the
 * OrgIsolationGuard check that findAll/findById already had, unlike every other service reviewed
 * this session where the read and write paths were kept consistent. message_templates has
 * fail-closed RLS so this wasn't actually exploitable, but there was zero app-layer defense.
 */
@ExtendWith(MockitoExtension.class)
class MessageTemplateServiceIsolationTest {

    @Mock private MessageTemplateRepository repository;
    @Mock private TemplateAbuseLinter abuseLinter;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private MessageTemplateService service;
    private UUID templateId;
    private MessageTemplate foreignTemplate;

    @BeforeEach
    void setUp() {
        service = new MessageTemplateService(repository, abuseLinter, orgIsolationGuard);
        templateId = UUID.randomUUID();
        foreignTemplate = MessageTemplate.builder()
                .id(templateId)
                .organizationId(UUID.randomUUID())
                .channel(Channel.SMS)
                .status(MessageTemplateStatus.DRAFT)
                .createdByUserId(UUID.randomUUID())
                .build();
        lenient().when(repository.findById(templateId)).thenReturn(Optional.of(foreignTemplate));
        lenient().when(orgIsolationGuard.belongsToOrg(any())).thenReturn(false);
    }

    @Test
    void activate_foreignOrgTemplate_throwsNotFound() {
        assertThatThrownBy(() -> service.activate(templateId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void submitForDlt_foreignOrgTemplate_throwsNotFound() {
        assertThatThrownBy(() -> service.submitForDlt(templateId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void retire_foreignOrgTemplate_throwsNotFound() {
        assertThatThrownBy(() -> service.retire(templateId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void retire_ownOrgTemplate_succeeds() {
        when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MessageTemplate result = service.retire(templateId, UUID.randomUUID());

        verify(repository).save(any());
        org.assertj.core.api.Assertions.assertThat(result.getStatus())
                .isEqualTo(MessageTemplateStatus.RETIRED);
    }
}
