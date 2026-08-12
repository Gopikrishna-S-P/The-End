import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

// NOTE: the "friday" path segment is intentional — legacy naming preserved server-side.
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

export const systemPromptApi = {
  get: async (promptKey: string): Promise<SystemPromptResponse> => {
    const r = await axiosInstance.get<ApiResponse<SystemPromptResponse>>(
      `/api/v1/friday/admin/prompts/${encodeURIComponent(promptKey)}`,
    );
    return r.data.data;
  },

  update: async (
    promptKey: string,
    body: { promptTemplate: string; description?: string },
  ): Promise<SystemPromptResponse> => {
    const r = await axiosInstance.put<ApiResponse<SystemPromptResponse>>(
      `/api/v1/friday/admin/prompts/${encodeURIComponent(promptKey)}`,
      body,
    );
    return r.data.data;
  },
};
