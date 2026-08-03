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

  /**
   * Opens a document in a new tab via the authenticated download endpoint. Deliberately does
   * NOT use CollectionDocumentResponse.fileUrl — that field is only populated when S3 storage
   * is enabled (aws.s3.enabled=false is the default; local storage is a documented supported
   * mode, not just a dev fallback), and even when populated a plain <a href> wouldn't carry the
   * JWT this endpoint requires.
   */
  openDocument: async (collectionId: string, documentId: string): Promise<void> => {
    const blob = await documentsApi.downloadDocument(collectionId, documentId);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  deleteDocument: async (collectionId: string, documentId: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/collections/${collectionId}/documents/${documentId}`);
  },
};
