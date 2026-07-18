import axiosInstance from './axiosInstance';
import type {
  ApiResponse, PagedResponse,
  ReconciliationRunResponse, IngestStatementRequest,
  BankStatementRowResponse, ReconciliationOutcome,
} from '../types';

export const reconciliationApi = {
  ingest: async (data: IngestStatementRequest): Promise<ReconciliationRunResponse> => {
    const response = await axiosInstance.post<ApiResponse<ReconciliationRunResponse>>('/api/v1/reconciliation/runs', data);
    return response.data.data;
  },

  listRuns: async (params: { orgId: string; page?: number; size?: number }, signal?: AbortSignal): Promise<PagedResponse<ReconciliationRunResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<ReconciliationRunResponse>>>('/api/v1/reconciliation/runs', { params, signal });
    return response.data.data;
  },

  getRun: async (id: string): Promise<ReconciliationRunResponse> => {
    const response = await axiosInstance.get<ApiResponse<ReconciliationRunResponse>>(`/api/v1/reconciliation/runs/${id}`);
    return response.data.data;
  },

  listRows: async (id: string, params: {
    outcome?: ReconciliationOutcome;
    page?: number;
    size?: number;
  } = {}): Promise<PagedResponse<BankStatementRowResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<BankStatementRowResponse>>>(`/api/v1/reconciliation/runs/${id}/rows`, { params });
    return response.data.data;
  },
};
