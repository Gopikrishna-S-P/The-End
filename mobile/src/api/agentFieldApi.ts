import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type {
  AgentShiftResponse, AgentSyncRequest, AgentSyncResponse, IncidentReportResponse,
  LocationPingRequest, SosRequest, StartShiftRequest,
} from '@/types/agentField';

export const agentFieldApi = {
  startShift: async (data: StartShiftRequest): Promise<AgentShiftResponse> => {
    const response = await axiosInstance.post<ApiResponse<AgentShiftResponse>>('/api/v1/agent/shifts/start', data);
    return response.data.data;
  },

  endShift: async (agentId: string): Promise<AgentShiftResponse> => {
    const response = await axiosInstance.post<ApiResponse<AgentShiftResponse>>('/api/v1/agent/shifts/end', { agentId });
    return response.data.data;
  },

  currentShift: async (agentId: string): Promise<AgentShiftResponse | null> => {
    const response = await axiosInstance.get<ApiResponse<AgentShiftResponse | null>>('/api/v1/agent/shifts/current', {
      params: { agentId },
    });
    return response.data.data;
  },

  recordPing: async (data: LocationPingRequest): Promise<void> => {
    await axiosInstance.post('/api/v1/agent/location', data);
  },

  triggerSos: async (data: SosRequest): Promise<IncidentReportResponse> => {
    const response = await axiosInstance.post<ApiResponse<IncidentReportResponse>>('/api/v1/agent/sos', data);
    return response.data.data;
  },

  cancelSos: async (incidentId: string): Promise<void> => {
    await axiosInstance.post(`/api/v1/agent/incidents/${incidentId}/cancel`);
  },

  uploadSosAudio: async (agentId: string, audio: { uri: string; name: string; type: string }): Promise<void> => {
    const formData = new FormData();
    formData.append('agentId', agentId);
    formData.append('audio', { uri: audio.uri, name: audio.name, type: audio.type } as unknown as Blob);
    await axiosInstance.post('/api/v1/agent/sos/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  sync: async (data: AgentSyncRequest): Promise<AgentSyncResponse> => {
    const response = await axiosInstance.post<ApiResponse<AgentSyncResponse>>('/api/v1/agent/sync', data);
    return response.data.data;
  },
};
