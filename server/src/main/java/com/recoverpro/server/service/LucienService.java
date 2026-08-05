package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.ChatRequest;
import com.recoverpro.server.dto.request.ConfirmActionRequest;
import com.recoverpro.server.dto.request.StartSessionRequest;
import com.recoverpro.server.dto.response.ChatMessageResponse;
import com.recoverpro.server.dto.response.ChatResponse;
import com.recoverpro.server.dto.response.SessionResponse;
import com.recoverpro.server.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface LucienService {

    SessionResponse startSession(StartSessionRequest request, UserPrincipal principal);

    ChatResponse chat(ChatRequest request, UserPrincipal principal);

    /** Resolve a WRITE tool confirmation (confirm=true) or cancellation (confirm=false). */
    ChatResponse confirmAction(String sessionId, ConfirmActionRequest request, UserPrincipal principal);

    SessionResponse getSession(String sessionId, UserPrincipal principal);

    Page<SessionResponse> getSessionsByAgent(UUID agentId, Pageable pageable, UserPrincipal principal);

    List<ChatMessageResponse> getSessionHistory(String sessionId, UserPrincipal principal);

    void closeSession(String sessionId, UserPrincipal principal);

    /** DPDP right-to-erasure: permanently delete a session and all its messages. */
    void deleteSession(String sessionId, UserPrincipal principal);
}
