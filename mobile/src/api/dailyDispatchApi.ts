import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type { AllocationResponse } from '@/types/domain';

export interface CreateDailyDispatchRequest {
  agentId: string;
  date: string;
  caseIds: string[];
}

export const dailyDispatchApi = {
  create: async (data: CreateDailyDispatchRequest): Promise<AllocationResponse[]> => {
    const r = await axiosInstance.post<ApiResponse<AllocationResponse[]>>(
      '/api/v1/daily-dispatch',
      data,
    );
    return r.data.data;
  },

  myList: async (date?: string): Promise<AllocationResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<AllocationResponse[]>>('/api/v1/daily-dispatch/me', {
      params: date ? { date } : undefined,
    });
    return response.data.data;
  },

  agentList: async (agentId: string, date?: string): Promise<AllocationResponse[]> => {
    const r = await axiosInstance.get<ApiResponse<AllocationResponse[]>>(
      `/api/v1/daily-dispatch/agent/${agentId}`,
      { params: date ? { date } : undefined },
    );
    return r.data.data;
  },

  removeCase: async (agentId: string, date: string, allocationId: string): Promise<void> => {
    await axiosInstance.delete('/api/v1/daily-dispatch/case', {
      data: { agentId, date, allocationId },
    });
  },

  orgSummary: async (date?: string): Promise<number> => {
    const r = await axiosInstance.get<ApiResponse<{ dispatched: number }>>(
      '/api/v1/daily-dispatch/org/summary',
      { params: date ? { date } : undefined },
    );
    return r.data.data.dispatched;
  },
};
