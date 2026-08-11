import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type { UnifiedDashboardResponse } from '@/types/domain';

export const analyticsApi = {
  getDashboard: async (): Promise<UnifiedDashboardResponse> => {
    const response = await axiosInstance.get<ApiResponse<UnifiedDashboardResponse>>(
      '/api/v1/analytics/dashboard'
    );
    return response.data.data;
  },
};
