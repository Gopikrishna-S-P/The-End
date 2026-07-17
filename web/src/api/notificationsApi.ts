import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '../types';

/** Backend NotifType — matches enums/NotifType.java exactly. */
export type ServerNotifType =
  | 'PLATFORM_ORG_ONBOARDED' | 'PLATFORM_SYSTEM_OUTAGE' | 'PLATFORM_SUSPICIOUS_LOGIN'
  | 'PLATFORM_GRIEVANCE_SLA_BREACH' | 'PLATFORM_MASS_DATA_EXPORT'
  | 'ORG_CALLING_HOURS_VIOLATION' | 'ORG_FREQUENCY_CAP_BREACH' | 'ORG_SOS_TRIGGERED'
  | 'ORG_HIGH_VALUE_PTP_BROKEN' | 'ORG_ALLOCATION_UPLOAD_DONE' | 'ORG_APPROVAL_PENDING_OVERDUE'
  | 'TL_TEAM_SOS' | 'TL_APPROVAL_REQUESTED' | 'TL_VISIT_FAILED' | 'TL_CASES_UNASSIGNED'
  | 'FO_CASE_ASSIGNED' | 'FO_VISIT_ASSIGNED' | 'FO_PTP_EXPIRING_SOON'
  | 'FO_SHIFT_STARTING' | 'FO_DO_NOT_CONTACT'
  | 'MENTION' | 'APPROVAL_DECIDED';

export type ServerNotifPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface ServerNotification {
  id: string;
  type: ServerNotifType;
  priority: ServerNotifPriority;
  title: string;
  body?: string;
  deepLink?: string;
  payloadJson?: string;
  createdAt: string;
  readAt?: string;
  snoozedUntil?: string;
}

export const notificationsApi = {
  list: async (unreadOnly = false, page = 0, size = 50): Promise<PagedResponse<ServerNotification>> => {
    const res = await axiosInstance.get<ApiResponse<PagedResponse<ServerNotification>>>(
      '/api/v1/notifications',
      { params: { unreadOnly, page, size } },
    );
    return res.data.data;
  },

  unreadCount: async (): Promise<number> => {
    const res = await axiosInstance.get<ApiResponse<{ count: number }>>(
      '/api/v1/notifications/unread-count',
    );
    return res.data.data.count;
  },

  markRead: async (id: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await axiosInstance.patch('/api/v1/notifications/read-all');
  },

  dismiss: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/notifications/${id}`);
  },

  snooze: async (id: string, durationMs: number): Promise<void> => {
    await axiosInstance.post(`/api/v1/notifications/${id}/snooze`, null, {
      params: { durationMs },
    });
  },
};
