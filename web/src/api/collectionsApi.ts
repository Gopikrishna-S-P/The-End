import axiosInstance from './axiosInstance';
import type { CollectionResponse, SubmitCollectionRequest, ApprovalRequest, ApiResponse, PagedResponse } from '../types';

interface DepositRequest {
  depositDate: string;
  depositAmount: number;
}

interface AgentCollectionReport {
  agentId: string;
  agentName: string;
  date: string;
  totalCollections: number;
  totalAmount: number;
  averagePerCollection: number;
}

export const collectionsApi = {
  submitCollection: async (data: SubmitCollectionRequest): Promise<CollectionResponse> => {
    const response = await axiosInstance.post<ApiResponse<CollectionResponse>>('/api/v1/collections', data);
    return response.data.data;
  },

  listCollections: async (params: {
    orgId?: string;
    agentId?: string;
    status?: string;
    paymentMode?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }): Promise<PagedResponse<CollectionResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<CollectionResponse>>>('/api/v1/collections', { params });
    return response.data.data;
  },

  getCollectionById: async (id: string): Promise<CollectionResponse> => {
    const response = await axiosInstance.get<ApiResponse<CollectionResponse>>(`/api/v1/collections/${id}`);
    return response.data.data;
  },

  approveCollection: async (id: string, data: ApprovalRequest): Promise<CollectionResponse> => {
    const response = await axiosInstance.patch<ApiResponse<CollectionResponse>>(`/api/v1/collections/${id}/approval`, data);
    return response.data.data;
  },

  depositCollection: async (id: string, data: DepositRequest): Promise<CollectionResponse> => {
    const response = await axiosInstance.patch<ApiResponse<CollectionResponse>>(`/api/v1/collections/${id}/deposit`, data);
    return response.data.data;
  },

  getAgentDailyReport: async (agentId: string, date: string): Promise<AgentCollectionReport> => {
    const response = await axiosInstance.get<ApiResponse<AgentCollectionReport>>(`/api/v1/reports/agents/${agentId}/collections/daily`, {
      params: { date },
    });
    return response.data.data;
  },

  getAgentAllTimeReport: async (agentId: string): Promise<AgentCollectionReport> => {
    const response = await axiosInstance.get<ApiResponse<AgentCollectionReport>>(`/api/v1/reports/agents/${agentId}/collections/summary`);
    return response.data.data;
  },

  cancelCollection: async (id: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/collections/${id}/cancel`);
  },

  exportCsv: async (params?: { fromDate?: string; toDate?: string }): Promise<string> => {
    const response = await axiosInstance.get<string>('/api/v1/collections/export', {
      params,
      responseType: 'text',
      headers: { Accept: 'text/csv' },
    });
    return response.data;
  },

  getBankCollections: async (params: {
    orgId?: string;
    agentId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<any>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<any>>>('/api/v1/collections/bank', { params });
    return response.data.data;
  },
};
