import axiosInstance from './axiosInstance';
import type { ApiResponse, MessageTemplate } from '../types';

// Matches server/src/main/java/com/recoverpro/server/controller/MessageTemplateController.java
// (/api/v1/message-templates) exactly — 3 maker-checker action endpoints.
// @PreAuthorize hasAnyRole('ORG_ADMIN','PLATFORM_ADMIN') on all three.
//
// IMPORTANT: the backend has NO list/get/create endpoint for templates (by design —
// templates are seeded directly into the message_templates table by a "maker", per the
// controller javadoc). There is no way to discover a template's id or content from this
// API surface. See BCR-3 in BACKEND-REQUESTS.md — a real review queue needs a GET list
// endpoint; until then this module only supports acting on an already-known template id.

export const messageTemplatesApi = {
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
