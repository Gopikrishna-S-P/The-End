import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '../types';

export interface StartSessionRequest {
  agentId: string;
  agentFirstName: string;
}

export interface SessionResponse {
  sessionId: string;
  agentId: string;
  agentFirstName: string;
  active: boolean;
  totalMessages: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
}

export type SafetyDecision = 'ALLOWED' | 'BLOCKED_PII' | 'BLOCKED_OFF_TOPIC' | 'BLOCKED_HARMFUL';

export interface ChatResponse {
  messageId: string;
  sessionId: string;
  reply: string;
  blocked: boolean;
  blockReason?: string;
  inputSafetyDecision?: SafetyDecision;
  outputSafetyDecision?: SafetyDecision;
  latencyMs?: number;
  timestamp: string;
  modelName?: string;
  /** Populated when Lucien has a WRITE tool pending user confirmation (design-doc §6.3). */
  confirmationRequired: boolean;
  pendingActionId?: string;
  pendingActionSummary?: string;
  pendingToolName?: string;
}

export interface ChatMessageResponse {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  wasBlocked: boolean;
  createdAt: string;
}

export interface ConfirmActionRequest {
  actionId: string;
  confirmed: boolean;
}

/** Languages the local Indic TTS microservice (tts-service/) can speak. */
export type IndicVoiceLang = 'hi' | 'ta' | 'kn' | 'te';

/** 'en' means "use the browser's built-in voice" — no backend call. */
export type VoiceLang = 'en' | IndicVoiceLang;

export const lucienApi = {
  startSession: async (data: StartSessionRequest): Promise<SessionResponse> => {
    const response = await axiosInstance.post<ApiResponse<SessionResponse>>('/api/v1/lucien/sessions', data);
    return response.data.data;
  },

  /**
   * `signal` lets the caller abort an in-flight reply — this is what backs the
   * composer's "Stop" control. Aborting only cancels the client's wait; the
   * server-side turn may still complete and be visible in session history.
   */
  sendMessage: async (data: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> => {
    const response = await axiosInstance.post<ApiResponse<ChatResponse>>('/api/v1/lucien/chat', data, {
      signal,
      timeout: 300_000,
    });
    return response.data.data;
  },

  /** Confirm (confirmed=true) or cancel (confirmed=false) a pending WRITE tool action. */
  confirmAction: async (sessionId: string, data: ConfirmActionRequest): Promise<ChatResponse> => {
    const response = await axiosInstance.post<ApiResponse<ChatResponse>>(
      `/api/v1/lucien/sessions/${sessionId}/confirm`,
      data,
    );
    return response.data.data;
  },

  getSession: async (sessionId: string): Promise<SessionResponse> => {
    const response = await axiosInstance.get<ApiResponse<SessionResponse>>(`/api/v1/lucien/sessions/${sessionId}`);
    return response.data.data;
  },

  getSessionHistory: async (sessionId: string): Promise<ChatMessageResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<ChatMessageResponse[]>>(`/api/v1/lucien/sessions/${sessionId}/history`);
    return response.data.data;
  },

  getAgentSessions: async (agentId: string, page = 0, size = 20): Promise<PagedResponse<SessionResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<SessionResponse>>>(`/api/v1/lucien/agents/${agentId}/sessions`, {
      params: { page, size },
    });
    return response.data.data;
  },

  /**
   * Marks the session inactive but keeps its history intact. This is the
   * correct call for a "New chat" action — it does NOT erase data.
   */
  closeSession: async (sessionId: string): Promise<void> => {
    await axiosInstance.post(`/api/v1/lucien/sessions/${sessionId}/close`);
  },

  /**
   * DPDP erasure — permanently and irreversibly deletes the session and all
   * of its messages. Do not call this for routine "start a new chat" flows;
   * use closeSession() instead. Reserve this for an explicit user-initiated
   * "delete this conversation" action.
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/lucien/sessions/${sessionId}`);
  },

  /**
   * Synthesizes `text` as spoken audio in an Indic language via the local
   * tts-service. Silent on failure at the call site is the caller's job —
   * this suppresses the global error toast (`_noToast`) since voice output
   * is a nice-to-have that should fall back to browser TTS, not alarm the
   * user, and skips retries (`_noRetry`) so that fallback happens quickly.
   */
  speak: async (text: string, lang: IndicVoiceLang, signal?: AbortSignal): Promise<Blob> => {
    const response = await axiosInstance.post('/api/v1/lucien/speak', { text, lang }, {
      signal,
      responseType: 'blob',
      timeout: 60_000,
      _noToast: true,
      _noRetry: true,
    });
    return response.data;
  },
};
