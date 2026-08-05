import axiosInstance from './axiosInstance';
import type {
  CollectionResponse, SubmitCollectionRequest, ApprovalRequest, DepositRequest,
  AgentCollectionReport, LedgerBalanceResponse, ApiResponse, PagedResponse,
} from '../types';

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

  /** Collections tied to the same loan number as this allocation (server groups by loanNumber). */
  getByAllocation: async (allocationId: string): Promise<CollectionResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<CollectionResponse[]>>(`/api/v1/collections/allocation/${allocationId}`);
    return response.data.data;
  },

  approveCollection: async (id: string, data: ApprovalRequest): Promise<CollectionResponse> => {
    const response = await axiosInstance.patch<ApiResponse<CollectionResponse>>(`/api/v1/collections/${id}/approval`, data);
    return response.data.data;
  },

  /** Server's DepositRequest carries only an optional `notes` field — no depositDate/depositAmount. */
  depositCollection: async (id: string, data: DepositRequest): Promise<CollectionResponse> => {
    const response = await axiosInstance.patch<ApiResponse<CollectionResponse>>(`/api/v1/collections/${id}/deposit`, data);
    return response.data.data;
  },

  getAgentDailyReport: async (agentId: string, date: string): Promise<AgentCollectionReport> => {
    const response = await axiosInstance.get<ApiResponse<AgentCollectionReport>>(`/api/v1/collections/reports/agent/${agentId}/daily`, {
      params: { date },
    });
    return response.data.data;
  },

  getAgentAllTimeReport: async (agentId: string): Promise<AgentCollectionReport> => {
    const response = await axiosInstance.get<ApiResponse<AgentCollectionReport>>(`/api/v1/collections/reports/agent/${agentId}/all-time`);
    return response.data.data;
  },

  /** LEADS-only ledger snapshot for the caller's organization. */
  getLedgerBalances: async (): Promise<LedgerBalanceResponse> => {
    const response = await axiosInstance.get<ApiResponse<LedgerBalanceResponse>>('/api/v1/collections/ledger/balances');
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
};
