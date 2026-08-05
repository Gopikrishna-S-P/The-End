import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '../types';
import type {
  GrievanceResponse, RaiseGrievanceRequest,
  InvestigateGrievanceRequest, EscalateGrievanceRequest, ResolveGrievanceRequest,
  GrievanceStatus,
} from '../types/grievances';

export const grievancesApi = {
  raise: async (data: RaiseGrievanceRequest): Promise<GrievanceResponse> => {
    const response = await axiosInstance.post<ApiResponse<GrievanceResponse>>('/api/v1/grievances', data);
    return response.data.data;
  },

  acknowledge: async (id: string): Promise<GrievanceResponse> => {
    const response = await axiosInstance.post<ApiResponse<GrievanceResponse>>(`/api/v1/grievances/${id}/acknowledge`, {});
    return response.data.data;
  },

  investigate: async (id: string, data?: InvestigateGrievanceRequest): Promise<GrievanceResponse> => {
    const response = await axiosInstance.post<ApiResponse<GrievanceResponse>>(`/api/v1/grievances/${id}/investigate`, data || {});
    return response.data.data;
  },

  escalate: async (id: string, data?: EscalateGrievanceRequest): Promise<GrievanceResponse> => {
    const response = await axiosInstance.post<ApiResponse<GrievanceResponse>>(`/api/v1/grievances/${id}/escalate`, data || {});
    return response.data.data;
  },

  resolve: async (id: string, data: ResolveGrievanceRequest): Promise<GrievanceResponse> => {
    const response = await axiosInstance.post<ApiResponse<GrievanceResponse>>(`/api/v1/grievances/${id}/resolve`, data);
    return response.data.data;
  },

  close: async (id: string): Promise<GrievanceResponse> => {
    const response = await axiosInstance.post<ApiResponse<GrievanceResponse>>(`/api/v1/grievances/${id}/close`);
    return response.data.data;
  },

  getById: async (id: string): Promise<GrievanceResponse> => {
    const response = await axiosInstance.get<ApiResponse<GrievanceResponse>>(`/api/v1/grievances/${id}`);
    return response.data.data;
  },

  getByAllocation: async (allocationId: string): Promise<GrievanceResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<GrievanceResponse[]>>(`/api/v1/grievances/allocation/${allocationId}`);
    return response.data.data;
  },

  list: async (params: {
    status?: GrievanceStatus;
    page?: number;
    size?: number;
  } = {}, signal?: AbortSignal): Promise<PagedResponse<GrievanceResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<GrievanceResponse>>>('/api/v1/grievances', { params, signal });
    return response.data.data;
  },
};
