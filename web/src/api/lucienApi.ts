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

export interface ChatResponse {
  messageId: string;
  sessionId: string;
  reply: string;
  blocked: boolean;
  blockReason?: string;
  inputSafetyDecision?: string;
  outputSafetyDecision?: string;
  latencyMs?: number;
  timestamp: string;
  modelName?: string;
}

export interface ChatMessageResponse {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  wasBlocked: boolean;
  createdAt: string;
}

interface SystemPromptResponse {
  promptKey: string;
  promptText: string;
  context?: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

interface UpdateSystemPromptRequest {
  promptText: string;
  context?: string;
}

export const lucienApi = {
  startSession: async (data: StartSessionRequest): Promise<SessionResponse> => {
    const response = await axiosInstance.post<ApiResponse<SessionResponse>>('/api/v1/lucien/sessions', data);
    return response.data.data;
  },

  sendMessage: async (data: ChatRequest): Promise<ChatResponse> => {
    const response = await axiosInstance.post<ApiResponse<ChatResponse>>('/api/v1/lucien/chat', data);
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

  closeSession: async (sessionId: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/lucien/sessions/${sessionId}`);
  },

  getSystemPrompt: async (promptKey: string): Promise<SystemPromptResponse> => {
    const response = await axiosInstance.get<ApiResponse<SystemPromptResponse>>(`/api/v1/lucien/admin/prompts/${promptKey}`);
    return response.data.data;
  },

  updateSystemPrompt: async (promptKey: string, data: UpdateSystemPromptRequest): Promise<SystemPromptResponse> => {
    const response = await axiosInstance.put<ApiResponse<SystemPromptResponse>>(`/api/v1/lucien/admin/prompts/${promptKey}`, data);
    return response.data.data;
  },
};
