import axiosInstance from './axiosInstance';
import type { UserResponse, ApiResponse, PagedResponse, UserPermissionsResponse } from '../types';

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roleNames?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface AssignRoleRequest {
  /** Match server: AssignRoleRequest.roleName */
  roleName: string;
}

export const usersApi = {
  getCurrentUser: async (): Promise<UserResponse> => {
    const r = await axiosInstance.get<ApiResponse<UserResponse>>('/api/v1/users/me');
    return r.data.data;
  },

  getUserById: async (id: string): Promise<UserResponse> => {
    const r = await axiosInstance.get<ApiResponse<UserResponse>>(`/api/v1/users/${id}`);
    return r.data.data;
  },

  listUsers: async (
    page = 0,
    size = 20,
    sortBy = 'createdAt',
    sortDir: 'asc' | 'desc' = 'desc',
  ): Promise<PagedResponse<UserResponse>> => {
    const r = await axiosInstance.get<ApiResponse<PagedResponse<UserResponse>>>('/api/v1/users', {
      params: { page, size, sortBy, sortDir },
    });
    return r.data.data;
  },

  createUser: async (data: CreateUserRequest): Promise<UserResponse> => {
    const r = await axiosInstance.post<ApiResponse<UserResponse>>('/api/v1/users', data);
    return r.data.data;
  },

  updateUser: async (id: string, data: UpdateUserRequest): Promise<UserResponse> => {
    const r = await axiosInstance.patch<ApiResponse<UserResponse>>(`/api/v1/users/${id}`, data);
    return r.data.data;
  },

  assignRole: async (userId: string, data: AssignRoleRequest): Promise<UserResponse> => {
    const r = await axiosInstance.post<ApiResponse<UserResponse>>(`/api/v1/users/${userId}/roles`, data);
    return r.data.data;
  },

  removeRole: async (userId: string, roleName: string): Promise<UserResponse> => {
    const r = await axiosInstance.delete<ApiResponse<UserResponse>>(
      `/api/v1/users/${userId}/roles/${roleName}`,
    );
    return r.data.data;
  },

  enableUser: async (userId: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/users/${userId}/enable`);
  },

  disableUser: async (userId: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/users/${userId}/disable`);
  },

  deleteUser: async (userId: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/users/${userId}`);
  },

  listByRole: async (roleName: string): Promise<UserResponse[]> => {
    const r = await axiosInstance.get<ApiResponse<UserResponse[]>>(
      `/api/v1/users/by-role/${roleName}`,
    );
    return r.data.data;
  },

  getUserPermissions: async (userId: string): Promise<UserPermissionsResponse> => {
    const r = await axiosInstance.get<ApiResponse<UserPermissionsResponse>>(
      `/api/v1/users/${userId}/permissions`,
    );
    return r.data.data;
  },

  grantPermission: async (userId: string, permissionName: string): Promise<UserPermissionsResponse> => {
    const r = await axiosInstance.post<ApiResponse<UserPermissionsResponse>>(
      `/api/v1/users/${userId}/permissions/${permissionName}`,
    );
    return r.data.data;
  },

  revokePermission: async (userId: string, permissionName: string): Promise<UserPermissionsResponse> => {
    const r = await axiosInstance.delete<ApiResponse<UserPermissionsResponse>>(
      `/api/v1/users/${userId}/permissions/${permissionName}`,
    );
    return r.data.data;
  },
};
