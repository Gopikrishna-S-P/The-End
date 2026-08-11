import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export interface AgentResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  enabled: boolean;
  role: string;
}

export const agentsApi = {
  list: async (): Promise<AgentResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<AgentResponse[]>>('/api/v1/users/by-role/FO');
    return response.data.data;
  },
};
