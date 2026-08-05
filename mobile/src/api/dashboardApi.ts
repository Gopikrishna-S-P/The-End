import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type { FieldAgentDashboardResponse } from '@/types/domain';

export const dashboardApi = {
  fieldAgent: async (agentId: string): Promise<FieldAgentDashboardResponse> => {
    const response = await axiosInstance.get<ApiResponse<FieldAgentDashboardResponse>>(
      `/api/v1/dashboard/field-agent/${agentId}`,
    );
    return response.data.data;
  },
};
