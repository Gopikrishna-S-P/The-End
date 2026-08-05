import axiosInstance, { newIdempotencyKey } from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type { AgentCollectionReport, CollectionDocumentResponse, CollectionResponse, SubmitCollectionRequest } from '@/types/domain';

export const collectionsApi = {
  submit: async (data: Omit<SubmitCollectionRequest, 'idempotencyKey'>): Promise<CollectionResponse> => {
    const payload: SubmitCollectionRequest = { ...data, idempotencyKey: newIdempotencyKey() };
    const response = await axiosInstance.post<ApiResponse<CollectionResponse>>('/api/v1/collections', payload);
    return response.data.data;
  },

  uploadDocument: async (collectionId: string, photo: { uri: string; name: string; type: string }): Promise<CollectionDocumentResponse> => {
    const formData = new FormData();
    formData.append('file', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
    const response = await axiosInstance.post<ApiResponse<CollectionDocumentResponse>>(
      `/api/v1/collections/${collectionId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  getByAllocation: async (allocationId: string): Promise<CollectionResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<CollectionResponse[]>>(`/api/v1/collections/allocation/${allocationId}`);
    return response.data.data;
  },

  myDailyReport: async (agentId: string, date: string): Promise<AgentCollectionReport> => {
    const response = await axiosInstance.get<ApiResponse<AgentCollectionReport>>(
      `/api/v1/collections/reports/agent/${agentId}/daily`,
      { params: { date } },
    );
    return response.data.data;
  },
};
