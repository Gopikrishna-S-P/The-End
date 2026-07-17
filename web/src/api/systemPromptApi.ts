import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

export interface SystemPromptResponse {
  promptKey: string;
  promptText: string;
  context?: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export interface UpdateSystemPromptRequest {
  promptText: string;
  context?: string;
}

export const systemPromptApi = {
  get: async (promptKey: string): Promise<SystemPromptResponse> => {
    const response = await axiosInstance.get<ApiResponse<SystemPromptResponse>>(
      `/api/v1/lucien/admin/prompts/${encodeURIComponent(promptKey)}`,
    );
    return response.data.data;
  },

  update: async (
    promptKey: string,
    body: UpdateSystemPromptRequest,
  ): Promise<SystemPromptResponse> => {
    const response = await axiosInstance.put<ApiResponse<SystemPromptResponse>>(
      `/api/v1/lucien/admin/prompts/${encodeURIComponent(promptKey)}`,
      body,
    );
    return response.data.data;
  },
};
