import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export interface RoleResponse {
  id: string;
  name: string;
  description?: string;
  systemRole: boolean;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export const rolesApi = {
  listRoles: async (): Promise<RoleResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<RoleResponse[]>>('/api/v1/roles');
    return response.data.data;
  },

  createRole: async (data: CreateRoleRequest): Promise<RoleResponse> => {
    const response = await axiosInstance.post<ApiResponse<RoleResponse>>('/api/v1/roles', data);
    return response.data.data;
  },
};
