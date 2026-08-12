import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface MessageTemplate {
  id: string;
  templateKey: string;
  body: string;
  subject?: string;
  status: string;
  channel: string;
  version: number;
  language: string;
}

export const messageTemplatesApi = {
  list: async (params?: {
    status?: string; channel?: string; page?: number; size?: number;
  }): Promise<PagedResponse<MessageTemplate>> => {
    const res = await axiosInstance.get<ApiResponse<PagedResponse<MessageTemplate>>>(
      '/api/v1/message-templates', { params },
    );
    return res.data.data;
  },
};
