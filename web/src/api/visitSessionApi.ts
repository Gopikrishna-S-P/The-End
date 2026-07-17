import axiosInstance from './axiosInstance';
import type {
  ApiResponse, VisitSession, TeamStatusEntry,
  DistanceSummaryEntry, StartVisitRequest, VisitTransitionRequest, PingRequest,
} from '../types';

export const visitSessionApi = {
  start: async (req: StartVisitRequest): Promise<VisitSession> => {
    const r = await axiosInstance.post<ApiResponse<VisitSession>>('/api/v1/visit-sessions', req);
    return r.data.data;
  },

  reached: async (id: string, req: VisitTransitionRequest): Promise<VisitSession> => {
    const r = await axiosInstance.post<ApiResponse<VisitSession>>(`/api/v1/visit-sessions/${id}/reached`, req);
    return r.data.data;
  },

  waiting: async (id: string, req: VisitTransitionRequest): Promise<VisitSession> => {
    const r = await axiosInstance.post<ApiResponse<VisitSession>>(`/api/v1/visit-sessions/${id}/waiting`, req);
    return r.data.data;
  },

  ping: async (id: string, req: PingRequest): Promise<number> => {
    const r = await axiosInstance.post<ApiResponse<{ distanceMetres: number }>>(`/api/v1/visit-sessions/${id}/ping`, req);
    return r.data.data.distanceMetres;
  },

  close: async (id: string, visitLogId?: string): Promise<VisitSession> => {
    const r = await axiosInstance.post<ApiResponse<VisitSession>>(`/api/v1/visit-sessions/${id}/close`,
      visitLogId ? { visitLogId } : {});
    return r.data.data;
  },

  abandon: async (id: string): Promise<VisitSession> => {
    const r = await axiosInstance.post<ApiResponse<VisitSession>>(`/api/v1/visit-sessions/${id}/abandon`);
    return r.data.data;
  },

  getActive: async (): Promise<VisitSession | null> => {
    const r = await axiosInstance.get<ApiResponse<VisitSession | null>>('/api/v1/visit-sessions/active');
    return r.data.data;
  },

  getToday: async (): Promise<VisitSession[]> => {
    const r = await axiosInstance.get<ApiResponse<VisitSession[]>>('/api/v1/visit-sessions/today');
    return r.data.data;
  },

  getByVisitLogId: async (visitLogId: string): Promise<VisitSession | null> => {
    const r = await axiosInstance.get<ApiResponse<VisitSession | null>>(
      `/api/v1/visit-sessions/by-visit-log/${visitLogId}`);
    return r.data.data ?? null;
  },

  getTeamStatus: async (date?: string): Promise<TeamStatusEntry[]> => {
    const r = await axiosInstance.get<ApiResponse<TeamStatusEntry[]>>('/api/v1/visit-sessions/team-status',
      { params: date ? { date } : {} });
    return r.data.data;
  },

  getDistanceSummary: async (date?: string): Promise<DistanceSummaryEntry[]> => {
    const r = await axiosInstance.get<ApiResponse<DistanceSummaryEntry[]>>('/api/v1/visit-sessions/distance-summary',
      { params: date ? { date } : {} });
    return r.data.data;
  },
};
