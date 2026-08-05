import axiosInstance from './axiosInstance';
import type { ApiResponse, MessageTemplate, MessageTemplateChannel, MessageTemplateStatus, PagedResponse } from '../types';

// Matches server/src/main/java/com/recoverpro/server/controller/MessageTemplateController.java
// (/api/v1/message-templates) exactly.
// @PreAuthorize hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN') on all endpoints; list/getById also
// allow MANAGER/TL (read-only review queue access).
//
// BCR-3 (a real review queue needs a list endpoint) is resolved — the backend gained
// list/getById since this module was first written. organizationId is resolved server-side
// from the caller's JWT for everyone except PLATFORM_ADMIN, who may pass one explicitly.

export const messageTemplatesApi = {
  /** GET /api/v1/message-templates — paginated, optionally filtered by status/channel. */
  list: async (params?: {
    status?: MessageTemplateStatus; channel?: MessageTemplateChannel; page?: number; size?: number;
  }): Promise<PagedResponse<MessageTemplate>> => {
    const res = await axiosInstance.get<ApiResponse<PagedResponse<MessageTemplate>>>(
      '/api/v1/message-templates', { params },
    );
    return res.data.data;
  },

  /** GET /api/v1/message-templates/{id}. */
  getById: async (id: string): Promise<MessageTemplate> => {
    const res = await axiosInstance.get<ApiResponse<MessageTemplate>>(
      `/api/v1/message-templates/${id}`,
    );
    return res.data.data;
  },

  /** POST /api/v1/message-templates/{id}/submit-for-dlt — DRAFT → PENDING_DLT. */
  submitForDlt: async (id: string): Promise<MessageTemplate> => {
    const res = await axiosInstance.post<ApiResponse<MessageTemplate>>(
      `/api/v1/message-templates/${id}/submit-for-dlt`,
    );
    return res.data.data;
  },

  /** POST /api/v1/message-templates/{id}/activate — DRAFT|PENDING_DLT → ACTIVE.
   *  Fails if the acting user is the template's creator (separation of duties). */
  activate: async (id: string): Promise<MessageTemplate> => {
    const res = await axiosInstance.post<ApiResponse<MessageTemplate>>(
      `/api/v1/message-templates/${id}/activate`,
    );
    return res.data.data;
  },

  /** POST /api/v1/message-templates/{id}/retire — any status → RETIRED (idempotent). */
  retire: async (id: string): Promise<MessageTemplate> => {
    const res = await axiosInstance.post<ApiResponse<MessageTemplate>>(
      `/api/v1/message-templates/${id}/retire`,
    );
    return res.data.data;
  },
};
