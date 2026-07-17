import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '../types';

export interface NonContactableResponse {
  id: string;
  organizationId: string;
  allocationId: string;
  visitId?: string;
  agentId: string;
  reason: string;
  notes?: string;
  createdAt: string;
}

export interface CreateNonContactableRequest {
  allocationId: string;
  visitId?: string;
  /** ABSENT, REFUSED, WRONG_ADDRESS, MOVED, RELOCATED, DECEASED, OTHER … */
  reason: string;
  notes?: string;
}

export const nonContactablesApi = {
  create: async (data: CreateNonContactableRequest): Promise<NonContactableResponse> => {
    const r = await axiosInstance.post<ApiResponse<NonContactableResponse>>(
      '/api/v1/non-contactables',
      data,
    );
    return r.data.data;
  },

  getById: async (id: string): Promise<NonContactableResponse> => {
    const r = await axiosInstance.get<ApiResponse<NonContactableResponse>>(
      `/api/v1/non-contactables/${id}`,
    );
    return r.data.data;
  },

  listForAllocation: async (allocationId: string): Promise<NonContactableResponse[]> => {
    const r = await axiosInstance.get<ApiResponse<NonContactableResponse[]>>(
      `/api/v1/non-contactables/allocation/${allocationId}`,
    );
    return r.data.data;
  },

  list: async (page = 0, size = 20): Promise<PagedResponse<NonContactableResponse>> => {
    const r = await axiosInstance.get<ApiResponse<PagedResponse<NonContactableResponse>>>(
      '/api/v1/non-contactables',
      { params: { page, size } },
    );
    return r.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/non-contactables/${id}`);
  },
};
