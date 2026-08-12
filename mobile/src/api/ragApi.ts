import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export type RagStatus = 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'FAILED' | 'SUPERSEDED';

export interface RagDocumentResponse {
  id: string;
  title: string;
  description?: string;
  contentType?: string;
  status: RagStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export const ragApi = {
  list: async (): Promise<RagDocumentResponse[]> => {
    const r = await axiosInstance.get<ApiResponse<RagDocumentResponse[]>>(
      '/api/v1/admin/rag-documents',
    );
    return r.data.data;
  },

  supersede: async (id: string): Promise<string> => {
    const r = await axiosInstance.delete<ApiResponse<string>>(
      `/api/v1/admin/rag-documents/${id}`,
    );
    return r.data.data;
  },
};
