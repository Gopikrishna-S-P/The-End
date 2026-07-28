import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type { CaseTimelineResponse } from '@/types/domain';

export const casesApi = {
  getTimeline: async (allocationId: string): Promise<CaseTimelineResponse> => {
    const response = await axiosInstance.get<ApiResponse<CaseTimelineResponse>>(`/api/v1/cases/${allocationId}/timeline`);
    return response.data.data;
  },
};
