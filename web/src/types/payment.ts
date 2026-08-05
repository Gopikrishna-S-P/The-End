// Payment orchestration types — mirrors PaymentController / PaymentLinkResolveController
// DTOs (server/src/main/java/com/recoverpro/server/dto/{request,response}/Payment*.java,
// server/src/main/java/com/recoverpro/server/enums/{PaymentIntentStatus,PaymentRail,Channel}.java).

export type PaymentIntentStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'RECONCILED'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export type PaymentRail =
  | 'UPI'
  | 'UPI_AUTOPAY'
  | 'NACH'
  | 'EMANDATE'
  | 'NEFT'
  | 'RTGS'
  | 'CHEQUE'
  | 'CASH';

/** Channel a payment link was issued through — distinct from collections' PaymentMode. */
export type PaymentLinkChannel =
  | 'SMS'
  | 'WHATSAPP'
  | 'RCS'
  | 'EMAIL'
  | 'VOICE_IVR'
  | 'VOICE_AGENT';

export interface CreatePaymentIntentRequest {
  organizationId: string;
  allocationId: string;
  borrowerId?: string;
  amount: number;
  purpose?: string;
  expiresAt?: string;
}

export interface PaymentIntentResponse {
  id: string;
  organizationId: string;
  allocationId: string;
  borrowerId?: string;
  amount: number;
  currency: string;
  purpose?: string;
  status: PaymentIntentStatus;
  expiresAt?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface CreatePaymentLinkRequest {
  intentId: string;
  rail: PaymentRail;
  issuedViaChannel?: PaymentLinkChannel;
  expiresAt?: string;
}

export interface PaymentLinkResponse {
  id: string;
  intentId: string;
  token: string;
  shortUrl?: string;
  targetUri?: string;
  issuedViaChannel?: PaymentLinkChannel;
  singleUse: boolean;
  expiresAt?: string;
  consumedAt?: string;
  createdAt: string;
}
