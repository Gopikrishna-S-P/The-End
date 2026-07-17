import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '../types';

export type RagSourceType = 'POLICY' | 'SCRIPT' | 'FAQ' | 'PROCEDURE' | 'OTHER';
export type RagStatus = 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'FAILED';

export interface RagDocumentResponse {
  id: string;
  organizationId: string;
  title: string;
  sourceType: RagSourceType;
  status: RagStatus;
  chunkCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentRequest {
  title: string;
  sourceType: RagSourceType;
  content: string;
}

export const ragApi = {
  list: async (page = 0, size = 20): Promise<PagedResponse<RagDocumentResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<RagDocumentResponse>>>(
      '/api/v1/lucien/rag/documents',
      { params: { page, size } },
    );
    return response.data.data;
  },

  upload: async (body: UploadDocumentRequest): Promise<RagDocumentResponse> => {
    const response = await axiosInstance.post<ApiResponse<RagDocumentResponse>>(
      '/api/v1/lucien/rag/documents',
      body,
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/lucien/rag/documents/${id}`);
  },
};
