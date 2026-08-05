// Matches server entity.MessageTemplate and enums.Channel / enums.MessageTemplateStatus
// exactly. See server/src/main/java/com/recoverpro/server/controller/MessageTemplateController.java
//
// Templates themselves are still seeded directly into the message_templates table by a
// "maker" (design-doc §4.6) — there is no create endpoint — but list/getById exist for the
// checker's review queue (BCR-3, resolved).

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
