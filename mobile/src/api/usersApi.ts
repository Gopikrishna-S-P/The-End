import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse, UserPermissionsResponse } from '@/types/core';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  roles?: { name: string }[];
}

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
  roleName: string;
}

export const usersApi = {
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

  enableUser: async (userId: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/users/${userId}/enable`);
  },

  disableUser: async (userId: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/users/${userId}/disable`);
  },

  deleteUser: async (userId: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/users/${userId}`);
  },

  getUserPermissions: async (userId: string): Promise<UserPermissionsResponse> => {
    const r = await axiosInstance.get<ApiResponse<UserPermissionsResponse>>(
      `/api/v1/users/${userId}/permissions`,
    );
    return r.data.data;
  },
};
