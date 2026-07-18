import axiosInstance from './axiosInstance';
import type {
  ApiResponse,
  AgentLiveStatusResponse,
  AgentShiftResponse,
  IncidentReportResponse,
  LocationPingRequest,
  PagedResponse,
  StartShiftRequest,
  SosRequest,
} from '../types';

export const fieldOpsApi = {
  listActive: async (orgId: string): Promise<AgentLiveStatusResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<AgentLiveStatusResponse[]>>(
      '/api/v1/agent/active',
      { params: { orgId } },
    );
    return response.data.data;
  },

  /** Starts a shift for the authenticated agent (server infers agentId from the JWT). */
  startShift: async (req: StartShiftRequest): Promise<AgentShiftResponse> => {
    const response = await axiosInstance.post<ApiResponse<AgentShiftResponse>>(
      '/api/v1/agent/shifts/start', req,
    );
    return response.data.data;
  },

  endShift: async (agentId: string): Promise<AgentShiftResponse> => {
    const response = await axiosInstance.post<ApiResponse<AgentShiftResponse>>(
      '/api/v1/agent/shifts/end', { agentId },
    );
    return response.data.data;
  },

  /** Returns null if the agent has no active shift. */
  currentShift: async (agentId: string): Promise<AgentShiftResponse | null> => {
    const response = await axiosInstance.get<ApiResponse<AgentShiftResponse | null>>(
      '/api/v1/agent/shifts/current', { params: { agentId } },
    );
    return response.data.data;
  },

  sos: async (req: SosRequest): Promise<IncidentReportResponse> => {
    const response = await axiosInstance.post<ApiResponse<IncidentReportResponse>>(
      '/api/v1/agent/sos', req,
    );
    return response.data.data;
  },

  cancelSos: async (incidentId: string): Promise<void> => {
    await axiosInstance.post(`/api/v1/agent/incidents/${incidentId}/cancel`);
  },

  /** Only accepted while the agent has an ACTIVE shift; server rate-caps at 12/min. */
  recordLocationPing: async (req: LocationPingRequest): Promise<void> => {
    await axiosInstance.post('/api/v1/agent/location', req);
  },

  /** Uploads a recorded SOS audio clip (post-hoc, not a live stream) for audit review. */
  uploadSosAudio: async (agentId: string, audio: Blob, filename = 'sos-clip.webm'): Promise<void> => {
    const fd = new FormData();
    fd.append('audio', audio, filename);
    await axiosInstance.post('/api/v1/agent/sos/audio', fd, {
      params: { agentId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
      `/api/v1/agent/incidents/${id}/resolve`,
      { notes },
    );
    return response.data.data;
  },
};
