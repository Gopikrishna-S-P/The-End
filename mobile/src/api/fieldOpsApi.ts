import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface IncidentReportResponse {
  id: string;
  organizationId: string;
  agentId: string;
  agentName: string | null;
  type: string;
  description: string;
  resolvedAt: string | null;
  createdAt: string;
}

export const fieldOpsApi = {
  listIncidents: async (params: {
    orgId: string;
    unresolvedOnly?: boolean;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<IncidentReportResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<IncidentReportResponse>>>('/api/v1/agent/incidents', { params });
    return response.data.data;
  },

  resolveIncident: async (id: string, notes?: string): Promise<IncidentReportResponse> => {
    const response = await axiosInstance.patch<ApiResponse<IncidentReportResponse>>(
      `/api/v1/agent/incidents/${id}/resolve`,
      { notes },
    );
    return response.data.data;
  },
};
