package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.LlamaMessage;
import com.recoverpro.server.dto.request.ChatRequest;
import com.recoverpro.server.dto.request.StartSessionRequest;
import com.recoverpro.server.dto.response.AgentContextDto;
import com.recoverpro.server.dto.response.ChatResponse;
import com.recoverpro.server.entity.ChatMessage;
import com.recoverpro.server.entity.ChatSession;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.ChatRole;
import com.recoverpro.server.lucien.agent.AgentLoopResult;
import com.recoverpro.server.lucien.agent.ConfirmationService;
import com.recoverpro.server.lucien.agent.LucienAgentLoop;
import com.recoverpro.server.lucien.tool.ToolRegistry;
import com.recoverpro.server.repository.ChatMessageRepository;
import com.recoverpro.server.repository.ChatSessionRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.AgentContextService;
import com.recoverpro.server.service.LucienTokenBudgetService;
import com.recoverpro.server.service.SystemPromptService;
import com.recoverpro.server.service.ai.ChatRateLimiter;
import com.recoverpro.server.service.ai.ContextAssembler;
import com.recoverpro.server.service.safety.DataSanitizer;
import com.recoverpro.server.service.safety.InputSafetyFilter;
import com.recoverpro.server.service.safety.OutputSafetyFilter;
import com.recoverpro.server.service.safety.SafetyFilterResult;
import com.recoverpro.server.prompt.SystemPromptBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * SYSTEM-PLAN SP43: one chat turn persists exactly two ChatMessage rows (user echo + assistant
 * reply), so the session's totalMessages counter must go up by exactly 2 -- previously done via
 * two separate incrementMessageCount() calls, which this test locks down as a single atomic
 * incrementBy(id, 2) instead.
 */
@ExtendWith(MockitoExtension.class)
class LucienServiceImplTest {

    @Mock private ChatSessionRepository sessionRepository;
    @Mock private ChatMessageRepository messageRepository;
    @Mock private InputSafetyFilter inputSafetyFilter;
    @Mock private OutputSafetyFilter outputSafetyFilter;
    @Mock private SystemPromptBuilder systemPromptBuilder;
    @Mock private SystemPromptService systemPromptService;
    @Mock private AgentContextService agentContextService;
    @Mock private ContextAssembler contextAssembler;
    @Mock private DataSanitizer dataSanitizer;
    @Mock private ChatRateLimiter chatRateLimiter;
    @Mock private LucienTokenBudgetService tokenBudgetService;
    @Mock private LucienAgentLoop agentLoop;
    @Mock private ToolRegistry toolRegistry;
    @Mock private ConfirmationService confirmationService;
    @Mock private OrgIsolationGuard orgIsolationGuard;
    @Mock private com.recoverpro.server.service.AllocationService allocationService;
    @Mock private com.recoverpro.server.service.VisitInterviewContextService visitInterviewContextService;
    @Mock private com.recoverpro.server.port.ModelClientPort modelClientPort;
    @Mock private com.recoverpro.server.lucien.ambient.AmbientReplyParser ambientReplyParser;

    private LucienServiceImpl service;
    private UUID agentId;
    private UserPrincipal principal;
    private ChatSession session;

    @BeforeEach
    void setUp() {
        service = new LucienServiceImpl(sessionRepository, messageRepository, inputSafetyFilter,
                outputSafetyFilter, systemPromptBuilder, systemPromptService, agentContextService,
                contextAssembler, dataSanitizer, chatRateLimiter, tokenBudgetService, agentLoop,
                toolRegistry, confirmationService, orgIsolationGuard, allocationService,
                visitInterviewContextService, modelClientPort, ambientReplyParser);

        agentId = UUID.randomUUID();
        User user = User.builder().id(agentId).organizationId(UUID.randomUUID()).build();
        principal = new UserPrincipal(user);

        session = ChatSession.builder().id("session-1").agentId(agentId).agentFirstName("Alex")
                .isActive(true).totalMessages(0).build();

        lenient().when(sessionRepository.findByIdAndIsActiveTrue("session-1")).thenReturn(Optional.of(session));
        lenient().when(tokenBudgetService.resolveOrgId(agentId)).thenReturn(Optional.of(principal.getOrganizationId()));
        lenient().when(inputSafetyFilter.filter(anyString())).thenReturn(SafetyFilterResult.allowed("hello"));
        lenient().when(agentContextService.buildContext(any(), any(), any()))
                .thenReturn(AgentContextDto.builder().agentFirstName("Alex").build());
        lenient().when(systemPromptService.resolveActiveTemplate(any())).thenReturn("template");
        lenient().when(toolRegistry.buildSchemaBlock()).thenReturn("");
        lenient().when(contextAssembler.assembleFor(any(), any())).thenReturn("");
        lenient().when(systemPromptBuilder.buildWithTools(any(), any(), any())).thenReturn("system prompt");
        lenient().when(messageRepository.findRecentBySessionId(any(), anyInt())).thenReturn(List.of());
        lenient().when(messageRepository.save(any())).thenAnswer(inv -> {
            ChatMessage m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });
    }

    @Test
    void chat_finalAnswer_incrementsSessionMessageCountByTwoInOneCall() {
        when(agentLoop.run(any(), eq("hello"), eq("session-1"), eq(principal)))
                .thenReturn(new AgentLoopResult.FinalAnswer("Hi there", 10, 5, List.of()));
        when(outputSafetyFilter.filter("Hi there")).thenReturn(SafetyFilterResult.allowed("Hi there"));
        when(dataSanitizer.stripPii("Hi there")).thenReturn("Hi there");

        ChatRequest request = ChatRequest.builder().sessionId("session-1").message("hello").build();

        ChatResponse response = service.chat(request, principal);

        assertThat(response.isBlocked()).isFalse();
        verify(sessionRepository).incrementBy("session-1", 2);
        verify(sessionRepository, never()).incrementMessageCount(any());
    }

    @Test
    void startSession_ambientModeWithAllocationId_persistsAmbientInteractionMode() {
        UUID allocationId = UUID.randomUUID();
        when(sessionRepository.save(any(ChatSession.class))).thenAnswer(inv -> inv.getArgument(0));

        StartSessionRequest request = StartSessionRequest.builder()
                .agentId(agentId)
                .agentFirstName("Priya")
                .allocationId(allocationId)
                .ambientMode(true)
                .build();

        service.startSession(request, principal);

        var captor = org.mockito.ArgumentCaptor.forClass(ChatSession.class);
        verify(sessionRepository).save(captor.capture());
        assertThat(captor.getValue().getInteractionMode()).isEqualTo("AMBIENT");
    }

    @Test
    void startSession_ambientModeWithoutAllocationId_throwsBusinessException() {
        StartSessionRequest request = StartSessionRequest.builder()
                .agentId(agentId)
                .agentFirstName("Priya")
                .ambientMode(true)
                .build();

        assertThatThrownBy(() -> service.startSession(request, principal))
                .isInstanceOf(com.recoverpro.server.common.exception.BusinessException.class)
                .hasMessageContaining("ambient");
    }

    @Test
    void ambientTurn_modelStaysSilent_persistsUserMessageOnlyAndReturnsNoSpeak() {
        ChatSession ambientSession = ChatSession.builder()
                .id("sess-1").agentId(agentId).organizationId(principal.getOrganizationId())
                .allocationId(UUID.randomUUID()).agentFirstName("Priya")
                .interactionMode("AMBIENT").isActive(true).totalMessages(0).build();
        when(sessionRepository.findByIdAndIsActiveTrue("sess-1")).thenReturn(Optional.of(ambientSession));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc("sess-1")).thenReturn(List.of());
        when(modelClientPort.chat(any())).thenReturn(
                new com.recoverpro.server.port.ModelClientResponse("{\"speak\":false,\"text\":null}", 10, 5));
        when(ambientReplyParser.parse(anyString()))
                .thenReturn(com.recoverpro.server.lucien.ambient.AmbientReplyParser.AmbientReply.silent());

        var request = com.recoverpro.server.dto.request.AmbientTurnRequest.builder()
                .text("Customer says nothing, just opened the door.").build();

        var response = service.ambientTurn("sess-1", request, false, principal);

        assertThat(response.isSpeak()).isFalse();
        assertThat(response.getText()).isNull();
        verify(messageRepository, org.mockito.Mockito.times(1)).save(any(ChatMessage.class));
    }

    @Test
    void ambientTurn_modelDecidesToSpeak_persistsBothMessagesAndReturnsText() {
        ChatSession ambientSession = ChatSession.builder()
                .id("sess-2").agentId(agentId).organizationId(principal.getOrganizationId())
                .allocationId(UUID.randomUUID()).agentFirstName("Priya")
                .interactionMode("AMBIENT").isActive(true).totalMessages(0).build();
        when(sessionRepository.findByIdAndIsActiveTrue("sess-2")).thenReturn(Optional.of(ambientSession));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc("sess-2")).thenReturn(List.of());
        when(modelClientPort.chat(any())).thenReturn(
                new com.recoverpro.server.port.ModelClientResponse(
                        "{\"speak\":true,\"text\":\"Ask if he can pay half today.\"}", 12, 8));
        when(ambientReplyParser.parse(anyString())).thenReturn(
                new com.recoverpro.server.lucien.ambient.AmbientReplyParser.AmbientReply(
                        true, "Ask if he can pay half today."));

        var request = com.recoverpro.server.dto.request.AmbientTurnRequest.builder()
                .text("Customer says I don't have the full amount.").build();

        var response = service.ambientTurn("sess-2", request, false, principal);

        assertThat(response.isSpeak()).isTrue();
        assertThat(response.getText()).isEqualTo("Ask if he can pay half today.");
        verify(messageRepository, org.mockito.Mockito.times(2)).save(any(ChatMessage.class));
    }

    @Test
    void ambientTurn_forceSpeak_addsHelpInstructionToPromptMessages() {
        ChatSession ambientSession = ChatSession.builder()
                .id("sess-3").agentId(agentId).organizationId(principal.getOrganizationId())
                .allocationId(UUID.randomUUID()).agentFirstName("Priya")
                .interactionMode("AMBIENT").isActive(true).totalMessages(0).build();
        when(sessionRepository.findByIdAndIsActiveTrue("sess-3")).thenReturn(Optional.of(ambientSession));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc("sess-3")).thenReturn(List.of());
        when(modelClientPort.chat(any())).thenReturn(
                new com.recoverpro.server.port.ModelClientResponse(
                        "{\"speak\":true,\"text\":\"Try offering a payment plan.\"}", 12, 8));
        when(ambientReplyParser.parse(anyString())).thenReturn(
                new com.recoverpro.server.lucien.ambient.AmbientReplyParser.AmbientReply(
                        true, "Try offering a payment plan."));

        var request = com.recoverpro.server.dto.request.AmbientTurnRequest.builder()
                .text("Long silence, negotiation stalled.").build();

        service.ambientTurn("sess-3", request, true, principal);

        var captor = org.mockito.ArgumentCaptor.forClass(java.util.List.class);
        verify(modelClientPort).chat((List<com.recoverpro.server.client.LlamaMessage>) captor.capture());
        List<com.recoverpro.server.client.LlamaMessage> sentMessages = captor.getValue();
        assertThat(sentMessages.stream().anyMatch(m -> m.getContent().contains("Help button")))
                .isTrue();
    }

    @Test
    void ambientTurn_sessionNotInAmbientMode_throwsBusinessException() {
        ChatSession chatSession = ChatSession.builder()
                .id("sess-4").agentId(agentId).organizationId(principal.getOrganizationId())
                .allocationId(UUID.randomUUID()).agentFirstName("Priya")
                .interactionMode("CHAT").isActive(true).totalMessages(0).build();
        when(sessionRepository.findByIdAndIsActiveTrue("sess-4")).thenReturn(Optional.of(chatSession));

        var request = com.recoverpro.server.dto.request.AmbientTurnRequest.builder()
                .text("hello").build();

        assertThatThrownBy(() -> service.ambientTurn("sess-4", request, false, principal))
                .isInstanceOf(com.recoverpro.server.common.exception.BusinessException.class);
    }
}
