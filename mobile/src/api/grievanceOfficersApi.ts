import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export interface GrievanceOfficerResponse {
  id: string;
  organizationId: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertGrievanceOfficerRequest {
  name: string;
  designation: string;
  email: string;
  phone: string;
  address?: string;
}

export const grievanceOfficersApi = {
  upsert: async (data: UpsertGrievanceOfficerRequest): Promise<GrievanceOfficerResponse> => {
    const response = await axiosInstance.put<ApiResponse<GrievanceOfficerResponse>>('/api/v1/grievance-officers', data);
    return response.data.data;
  },

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
