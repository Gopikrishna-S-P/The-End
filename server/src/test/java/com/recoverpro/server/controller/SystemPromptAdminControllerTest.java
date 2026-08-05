package com.recoverpro.server.controller;

import com.recoverpro.server.dto.request.UpdateSystemPromptRequest;
import com.recoverpro.server.dto.response.SystemPromptResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.SystemPromptService;
import com.recoverpro.server.service.UserActionAuditService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

/**
 * Regression coverage: updatePrompt/deletePrompt are platform-wide, consequential writes (they
 * change or remove the system prompt driving Lucien for every org) that previously only logged to
 * the application log, not the permanent user_action_audit_logs table -- the same gap already fixed
 * for RagDocumentAdminController and PlatformSubscriptionController this pass.
 */
@ExtendWith(MockitoExtension.class)
class SystemPromptAdminControllerTest {

    @Mock private SystemPromptService systemPromptService;
    @Mock private UserActionAuditService userActionAuditService;

    private SystemPromptAdminController newController() {
        return new SystemPromptAdminController(systemPromptService, userActionAuditService);
    }

    private UserPrincipal principal() {
        UserPrincipal p = mock(UserPrincipal.class);
        when(p.getId()).thenReturn(UUID.randomUUID());
        return p;
    }

    @Test
    void updatePrompt_writesAuditLogEntry() {
        SystemPromptAdminController controller = newController();
        UserPrincipal principal = principal();
        UpdateSystemPromptRequest request = UpdateSystemPromptRequest.builder()
                .promptTemplate("x".repeat(60)).build();
        when(systemPromptService.updatePrompt(eq("lucien_default"), eq(request), any()))
                .thenReturn(SystemPromptResponse.builder().promptKey("lucien_default").version(3).build());

        controller.updatePrompt("lucien_default", request, principal);

        verify(userActionAuditService).logUserAction(
                eq(principal.getId()), eq("SYSTEM_PROMPT_UPDATED"), contains("lucien_default"));
    }

    @Test
    void deletePrompt_writesAuditLogEntry() {
        SystemPromptAdminController controller = newController();
        UserPrincipal principal = principal();

        controller.deletePrompt("lucien_default", principal);

        verify(userActionAuditService).logUserAction(
                eq(principal.getId()), eq("SYSTEM_PROMPT_DELETED"), contains("lucien_default"));
    }
}
