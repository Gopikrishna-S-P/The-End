import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

/** Mirrors com.recoverpro.server.enums.RagDocumentStatus. */
export type RagStatus = 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'FAILED' | 'SUPERSEDED';

export interface RagDocumentResponse {
  id: string;
  title: string;
  description?: string;
  contentType?: string;
  status: RagStatus;
  errorMessage?: string;
  uploadedByUserId?: string;
  supersedesDocumentId?: string;
  createdAt: string;
  updatedAt: string;
}

export const ragApi = {
  /** GET /api/v1/admin/rag-documents — returns a plain (unpaged) list. */
  list: async (): Promise<RagDocumentResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<RagDocumentResponse[]>>(
      '/api/v1/admin/rag-documents',
    );
    return response.data.data;
  },

  /** POST /api/v1/admin/rag-documents — multipart/form-data (file, title, description). */
  upload: async (file: File, title: string, description?: string): Promise<RagDocumentResponse> => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    if (description) form.append('description', description);
    const response = await axiosInstance.post<ApiResponse<RagDocumentResponse>>(
      '/api/v1/admin/rag-documents',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  /** PUT /api/v1/admin/rag-documents/{id} — update title/description metadata only. */
  update: async (id: string, title: string, description?: string): Promise<RagDocumentResponse> => {
    const response = await axiosInstance.put<ApiResponse<RagDocumentResponse>>(
      `/api/v1/admin/rag-documents/${id}`,
      { title, description },
    );
    return response.data.data;
  },

  /** DELETE /api/v1/admin/rag-documents/{id} — soft "supersede" (deactivate), not a hard delete. */
  supersede: async (id: string): Promise<string> => {
    const response = await axiosInstance.delete<ApiResponse<string>>(`/api/v1/admin/rag-documents/${id}`);
    return response.data.data;
  },
};
