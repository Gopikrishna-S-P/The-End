import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface FraudCaseResponse {
  id: string;
  organizationId: string;
  caseNumber: string;
  category: string;
  status: string;
  amountInvolved: number;
  reportedAt: string;
}

export const fraudCasesApi = {
  list: async (params: {
    orgId: string;
    status?: string;
    page?: number;
    size?: number;
  }, signal?: AbortSignal): Promise<PagedResponse<FraudCaseResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<FraudCaseResponse>>>('/api/v1/fraud-cases', { params, signal });
    return response.data.data;
  },
};
