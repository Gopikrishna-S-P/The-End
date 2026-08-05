import axiosInstance from './axiosInstance';
import type { RoleResponse, ApiResponse } from '../types';

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export const rolesApi = {
  listRoles: async (): Promise<RoleResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<RoleResponse[]>>('/api/v1/roles');
    return response.data.data;
  },

  getRoleById: async (id: string): Promise<RoleResponse> => {
    const response = await axiosInstance.get<ApiResponse<RoleResponse>>(`/api/v1/roles/${id}`);
    return response.data.data;
  },

  createRole: async (data: CreateRoleRequest): Promise<RoleResponse> => {
    const response = await axiosInstance.post<ApiResponse<RoleResponse>>('/api/v1/roles', data);
    return response.data.data;
  },

  updateRolePermissions: async (id: string, permissionIds: string[]): Promise<RoleResponse> => {
    const response = await axiosInstance.patch<ApiResponse<RoleResponse>>(`/api/v1/roles/${id}/permissions`, permissionIds);
    return response.data.data;
  },

  deleteRole: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/roles/${id}`);
  },
};
