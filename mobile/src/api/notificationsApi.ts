import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type { ServerNotification } from '@/types/domain';

export const notificationsApi = {
  list: async (): Promise<ServerNotification[]> => {
    const response = await axiosInstance.get<ApiResponse<ServerNotification[]>>('/api/v1/notifications');
    return response.data.data;
  },

  unreadCount: async (): Promise<number> => {
    const response = await axiosInstance.get<ApiResponse<number>>('/api/v1/notifications/unread-count');
    return response.data.data;
  },

  markRead: async (id: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await axiosInstance.patch('/api/v1/notifications/read-all');
  },

  dismiss: async (id: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/notifications/${id}/dismiss`);
  },
};
