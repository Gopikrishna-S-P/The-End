// Matches server entity.MessageTemplate and enums.Channel / enums.MessageTemplateStatus
// exactly. See server/src/main/java/com/recoverpro/server/controller/MessageTemplateController.java
//
// NOTE: the backend exposes ONLY three maker-checker action endpoints
// (submit-for-dlt, activate, retire) — there is no list/get/create endpoint.
// See BCR-3 in BACKEND-REQUESTS.md.

export type MessageTemplateChannel =
  | 'SMS' | 'WHATSAPP' | 'RCS' | 'EMAIL' | 'VOICE_IVR' | 'VOICE_AGENT';

export type MessageTemplateStatus =
  | 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'PENDING_DLT' | 'RETIRED';

export interface MessageTemplate {
  id: string;
  organizationId: string;
  templateKey: string;
  version: string;
  channel: MessageTemplateChannel;
  language: string;
  subject?: string;
  body: string;
  dltTemplateId?: string;
  whatsappNamespace?: string;
  category?: string;
  status: MessageTemplateStatus;
  createdByUserId: string;
  approvedByUserId?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
