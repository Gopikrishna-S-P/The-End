import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

/**
 * NOTE: the "friday" path segment below is intentional — it is a legacy
 * naming choice preserved server-side (SystemPromptAdminController maps
 * to /api/v1/friday/admin/prompts). Do not "fix" it to say "lucien".
 */
export interface SystemPromptResponse {
  id: string;
  promptKey: string;
  promptTemplate: string;
  version: number;
  isActive: boolean;
  description?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface UpdateSystemPromptRequest {
  promptTemplate: string;
  description?: string;
}

export const systemPromptApi = {
  get: async (promptKey: string): Promise<SystemPromptResponse> => {
    const response = await axiosInstance.get<ApiResponse<SystemPromptResponse>>(
      `/api/v1/friday/admin/prompts/${encodeURIComponent(promptKey)}`,
    );
    return response.data.data;
  },

  update: async (
    promptKey: string,
    body: UpdateSystemPromptRequest,
  ): Promise<SystemPromptResponse> => {
    const response = await axiosInstance.put<ApiResponse<SystemPromptResponse>>(
      `/api/v1/friday/admin/prompts/${encodeURIComponent(promptKey)}`,
      body,
    );
    return response.data.data;
  },

  remove: async (promptKey: string): Promise<void> => {
    await axiosInstance.delete<ApiResponse<void>>(
      `/api/v1/friday/admin/prompts/${encodeURIComponent(promptKey)}`,
    );
  },
};
