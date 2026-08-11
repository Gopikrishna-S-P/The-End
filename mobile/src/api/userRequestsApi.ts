import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface UserCreationRequest {
  id: string;
  requestedEmail: string;
  requestedFirstName: string;
  requestedLastName: string;
  requestedRole: string;
  requestedStaffRole?: string;
  requestedById: string;
  requestedByName: string;
  status: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdUserId?: string;
  createdAt: string;
}

export const userRequestsApi = {
  listPending: async (page = 0, size = 20): Promise<PagedResponse<UserCreationRequest>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<UserCreationRequest>>>('/api/v1/user-requests/pending', {
      params: { page, size },
    });
    return response.data.data;
  },

  listMine: async (page = 0, size = 20): Promise<PagedResponse<UserCreationRequest>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<UserCreationRequest>>>('/api/v1/user-requests/mine', {
      params: { page, size },
    });
    return response.data.data;
  },
};
