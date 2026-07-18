import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

/**
 * Matches server/src/main/java/com/recoverpro/server/controller/NotificationController.java
 * (/api/v1/notifications) exactly — 3 endpoints, `@PreAuthorize("isAuthenticated()")`:
 *   GET    /api/v1/notifications           → unread notifications for the caller (no params, not paged)
 *   PATCH  /api/v1/notifications/read-all   → marks all of the caller's notifications read
 *   PATCH  /api/v1/notifications/{id}/read  → marks one notification read
 *
 * There is NO unread-count endpoint, NO dismiss/delete endpoint, NO snooze endpoint, and NO
 * SSE/WebSocket push endpoint, even though the `AppNotification` entity already has `dismissed`
 * and `snoozedUntil` columns. See BCR-3 in BACKEND-REQUESTS.md.
 */

/** Backend NotificationType — matches enums/NotificationType.java exactly. */
export type ServerNotifType =
  | 'PLATFORM_ORG_ONBOARDED' | 'PLATFORM_SYSTEM_OUTAGE' | 'PLATFORM_SUSPICIOUS_LOGIN' | 'PLATFORM_MASS_DATA_EXPORT'
  | 'ORG_CALLING_HOURS_VIOLATION' | 'ORG_FREQUENCY_CAP_BREACH' | 'ORG_SOS_TRIGGERED'
  | 'ORG_HIGH_VALUE_PTP_BROKEN' | 'ORG_ALLOCATION_UPLOAD_DONE' | 'ORG_APPROVAL_PENDING_OVERDUE'
  | 'TL_TEAM_SOS' | 'TL_APPROVAL_REQUESTED' | 'TL_VISIT_FAILED' | 'TL_CASES_UNASSIGNED'
  | 'FO_CASE_ASSIGNED' | 'FO_VISIT_ASSIGNED' | 'FO_DISPATCH_READY' | 'FO_PTP_EXPIRING_SOON'
  | 'FO_PTP_BROKEN' | 'FO_COLLECTION_RECORDED' | 'FO_SHIFT_STARTING' | 'FO_DO_NOT_CONTACT'
  | 'MENTION' | 'APPROVAL_DECIDED' | 'REPORT_READY' | 'USER_REQUEST_DECIDED';

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
  dismissed?: boolean;
}

export const notificationsApi = {
  /** GET /api/v1/notifications — always unread-only, no pagination/query params on the backend. */
  list: async (): Promise<ServerNotification[]> => {
    const res = await axiosInstance.get<ApiResponse<ServerNotification[]>>('/api/v1/notifications');
    return res.data.data;
  },

  markRead: async (id: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await axiosInstance.patch('/api/v1/notifications/read-all');
  },
};
