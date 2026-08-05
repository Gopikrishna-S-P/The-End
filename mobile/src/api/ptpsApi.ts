import axiosInstance, { newIdempotencyKey } from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';
import type { CreatePtpRequest, PtpFilterParams, PtpResponse, UpdatePtpStatusRequest } from '@/types/domain';

export const ptpsApi = {
  create: async (data: CreatePtpRequest): Promise<PtpResponse> => {
    const response = await axiosInstance.post<ApiResponse<PtpResponse>>('/api/v1/ptps', data, {
      headers: { 'Idempotency-Key': newIdempotencyKey() },
    });
    return response.data.data;
  },

  updateStatus: async (id: string, data: UpdatePtpStatusRequest): Promise<PtpResponse> => {
    const response = await axiosInstance.patch<ApiResponse<PtpResponse>>(`/api/v1/ptps/${id}/status`, data);
    return response.data.data;
  },

  list: async (params: PtpFilterParams): Promise<PagedResponse<PtpResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<PtpResponse>>>('/api/v1/ptps', { params });
    return response.data.data;
  },

  getByAllocation: async (allocationId: string): Promise<PtpResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<PtpResponse[]>>(`/api/v1/ptps/allocation/${allocationId}`);
    return response.data.data;
  },
};
