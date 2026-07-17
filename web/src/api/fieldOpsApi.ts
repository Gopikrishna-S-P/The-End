import axiosInstance from './axiosInstance';
import type {
  ApiResponse,
  AgentLiveStatusResponse,
  IncidentReportResponse,
  PagedResponse,
} from '../types';

export const fieldOpsApi = {
  listActive: async (orgId: string): Promise<AgentLiveStatusResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<AgentLiveStatusResponse[]>>(
      '/api/v1/agent/active',
      { params: { orgId } },
    );
    return response.data.data;
  },

  listIncidents: async (params: {
    orgId: string;
    unresolvedOnly?: boolean;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<IncidentReportResponse>> => {
    const response = await axiosInstance.get<
      ApiResponse<PagedResponse<IncidentReportResponse>>
    >('/api/v1/agent/incidents', { params });
    return response.data.data;
  },

  resolveIncident: async (id: string, notes?: string): Promise<IncidentReportResponse> => {
    const response = await axiosInstance.patch<ApiResponse<IncidentReportResponse>>(
      `/api/v1/incidents/${id}/resolve`,
      { notes },
    );
    return response.data.data;
  },
};
