import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type { AllocationResponse } from '@/types/domain';

export const dailyDispatchApi = {
  /** TL-curated "today's list" for the current user. Defaults server-side to today if date is omitted. */
  myList: async (date?: string): Promise<AllocationResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<AllocationResponse[]>>('/api/v1/daily-dispatch/me', {
      params: date ? { date } : undefined,
    });
    return response.data.data;
  },
};
