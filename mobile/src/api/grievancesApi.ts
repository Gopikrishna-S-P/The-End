import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface GrievanceResponse {
  id: string;
  organizationId: string;
  allocationId: string;
  ticketNumber: string;
  status: string;
  category: string;
  subject: string;
  createdAt: string;
}

export const grievancesApi = {
  list: async (params: {
    status?: string;
    page?: number;
    size?: number;
  } = {}, signal?: AbortSignal): Promise<PagedResponse<GrievanceResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<GrievanceResponse>>>('/api/v1/grievances', { params, signal });
    return response.data.data;
  },
};
