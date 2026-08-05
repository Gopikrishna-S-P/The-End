import axiosInstance, { newIdempotencyKey } from './axiosInstance';
import type {
  ApiResponse,
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  CreatePaymentLinkRequest,
  PaymentLinkResponse,
} from '../types';

// Mirrors PaymentController.java — note there is NO class-level @RequestMapping on the
// backend controller, so every path below is copied verbatim from the per-method mapping,
// not assembled from a shared prefix constant.
export const paymentApi = {
  /** POST /api/v1/payments/intents — ORG_ADMIN, PLATFORM_ADMIN, FO. Idempotent via header. */
  createIntent: async (data: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> => {
    const response = await axiosInstance.post<ApiResponse<PaymentIntentResponse>>(
      '/api/v1/payments/intents',
      data,
      { headers: { 'Idempotency-Key': newIdempotencyKey() } },
    );
    return response.data.data;
  },

  /** GET /api/v1/payments/intents/{id} — ORG_ADMIN, PLATFORM_ADMIN, FO (org-scoped; PLATFORM_ADMIN sees any). */
  getIntent: async (id: string): Promise<PaymentIntentResponse> => {
    const response = await axiosInstance.get<ApiResponse<PaymentIntentResponse>>(
      `/api/v1/payments/intents/${id}`,
    );
    return response.data.data;
  },

  /** POST /api/v1/payments/links — ORG_ADMIN, PLATFORM_ADMIN, FO. Issues a shareable payment link for an intent. */
  createLink: async (data: CreatePaymentLinkRequest): Promise<PaymentLinkResponse> => {
    const response = await axiosInstance.post<ApiResponse<PaymentLinkResponse>>(
      '/api/v1/payments/links',
      data,
    );
    return response.data.data;
  },
};
