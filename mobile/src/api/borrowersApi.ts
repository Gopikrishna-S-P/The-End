import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface BorrowerResponse {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  ckycId?: string;
  erasurePending: boolean;
  createdAt: string;
}

export const borrowersApi = {
  list: async (params: { orgId: string; page?: number; size?: number }): Promise<PagedResponse<BorrowerResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<BorrowerResponse>>>('/api/v1/borrowers', { params });
    return response.data.data;
  },

  getById: async (id: string): Promise<BorrowerResponse> => {
    const response = await axiosInstance.get<ApiResponse<BorrowerResponse>>(`/api/v1/borrowers/${id}`);
    return response.data.data;
  },
};
