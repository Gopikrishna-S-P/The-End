import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface ReconciliationRunResponse {
  id: string;
  organizationId: string;
  source: string;
  rowsIngested: number;
  matched: number;
  exceptions: number;
  asOfDate: string;
  createdAt: string;
}

export const reconciliationApi = {
  listRuns: async (params: { orgId: string; page?: number; size?: number }, signal?: AbortSignal): Promise<PagedResponse<ReconciliationRunResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<ReconciliationRunResponse>>>('/api/v1/reconciliation/runs', { params, signal });
    return response.data.data;
  },
};
