import axiosInstance from './axiosInstance';
import type { CollectionDocumentResponse, ApiResponse } from '../types';

/**
 * Collection payment-proof documents. All routes are nested under
 * /api/v1/collections/{collectionId}/documents on the server (DocumentController) —
 * documentId alone is never enough to address a document.
 */
export const documentsApi = {
  uploadDocument: async (collectionId: string, file: File): Promise<CollectionDocumentResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post<ApiResponse<CollectionDocumentResponse>>(`/api/v1/collections/${collectionId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  getDocuments: async (collectionId: string): Promise<CollectionDocumentResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<CollectionDocumentResponse[]>>(`/api/v1/collections/${collectionId}/documents`);
    return response.data.data;
  },

  downloadDocument: async (collectionId: string, documentId: string): Promise<Blob> => {
    const response = await axiosInstance.get(`/api/v1/collections/${collectionId}/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteDocument: async (collectionId: string, documentId: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/collections/${collectionId}/documents/${documentId}`);
  },
};
