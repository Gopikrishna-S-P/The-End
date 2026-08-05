import axiosInstance from './axiosInstance';
import type { PtpResponse, CreatePtpRequest, UpdatePtpStatusRequest, PtpFilterRequest, ApiResponse, PagedResponse } from '../types';

export const ptpsApi = {
  createPtp: async (data: CreatePtpRequest): Promise<PtpResponse> => {
    const response = await axiosInstance.post<ApiResponse<PtpResponse>>('/api/v1/ptps', data);
    return response.data.data;
  },

  /** Server binds `dir` (not `sortDir`) for sort direction on GET /api/v1/ptps. */
  listPtps: async (params: {
    page?: number;
    size?: number;
    sortBy?: string;
    dir?: string;
  }, filterData?: PtpFilterRequest): Promise<PagedResponse<PtpResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<PtpResponse>>>('/api/v1/ptps', {
      params: { ...filterData, ...params },
    });
    return response.data.data;
  },

  getPtpById: async (id: string): Promise<PtpResponse> => {
    const response = await axiosInstance.get<ApiResponse<PtpResponse>>(`/api/v1/ptps/${id}`);
    return response.data.data;
  },

  getPtpsByAllocation: async (allocationId: string): Promise<PtpResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<PtpResponse[]>>(`/api/v1/ptps/allocation/${allocationId}`);
    return response.data.data;
  },

  updatePtpStatus: async (id: string, data: UpdatePtpStatusRequest): Promise<PtpResponse> => {
    const response = await axiosInstance.patch<ApiResponse<PtpResponse>>(`/api/v1/ptps/${id}/status`, data);
    return response.data.data;
  },

  exportCsv: async (params?: { fromDate?: string; toDate?: string }): Promise<string> => {
    const response = await axiosInstance.get<string>('/api/v1/ptps/export', {
      params,
      responseType: 'text',
      headers: { Accept: 'text/csv' },
    });
    return response.data;
  },
};
