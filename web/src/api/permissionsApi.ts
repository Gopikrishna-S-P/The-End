import axiosInstance from './axiosInstance';
import type { PermissionResponse, ApiResponse } from '../types';

export const permissionsApi = {
  listPermissions: async (): Promise<PermissionResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<PermissionResponse[]>>('/api/v1/permissions');
    return response.data.data;
  },
};
