import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface RestructureProposalResponse {
  id: string;
  organizationId: string;
  allocationId: string;
  visitId?: string;
  status: string;
  originalEmiAmount: number;
  newEmiAmount: number;
  newEmiCount: number;
  createdAt: string;
}

export const restructureProposalsApi = {
  list: async (params: {
    status?: string;
    page?: number;
    size?: number;
  } = {}, signal?: AbortSignal): Promise<PagedResponse<RestructureProposalResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<RestructureProposalResponse>>>('/api/v1/restructure-proposals', { params, signal });
    return response.data.data;
  },
};
