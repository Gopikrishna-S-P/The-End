import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';
import type { GrievanceOfficerResponse, UpsertGrievanceOfficerRequest } from '../types/grievances';

export const grievanceOfficersApi = {
  upsert: async (data: UpsertGrievanceOfficerRequest): Promise<GrievanceOfficerResponse> => {
    const response = await axiosInstance.put<ApiResponse<GrievanceOfficerResponse>>('/api/v1/grievance-officers', data);
    return response.data.data;
  },

  /** Returns null when the org has no grievance officer recorded yet (backend responds 404). */
  get: async (): Promise<GrievanceOfficerResponse | null> => {
    try {
      const response = await axiosInstance.get<ApiResponse<GrievanceOfficerResponse>>('/api/v1/grievance-officers');
      return response.data.data;
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },
};
