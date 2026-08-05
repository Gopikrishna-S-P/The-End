import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';
import type { AllocationFilterParams, AllocationResponse } from '@/types/domain';

export const allocationsApi = {
  getMyCases: async (userId: string, params?: { page?: number; size?: number; searchTerm?: string }) => {
    const filter: AllocationFilterParams = {
      status: 'ASSIGNED',
      assignedToUserId: userId,
      page: params?.page ?? 0,
      size: params?.size ?? 100,
      searchTerm: params?.searchTerm,
    };
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AllocationResponse>>>('/api/v1/allocations', {
      params: filter,
    });
    return response.data.data;
  },

  getById: async (id: string): Promise<AllocationResponse> => {
    const response = await axiosInstance.get<ApiResponse<AllocationResponse>>(`/api/v1/allocations/${id}`);
    return response.data.data;
  },
};
