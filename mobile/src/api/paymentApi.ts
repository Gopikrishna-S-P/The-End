import axiosInstance, { newIdempotencyKey } from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type {
  CreatePaymentIntentRequest, CreatePaymentLinkRequest, PaymentIntentResponse, PaymentLinkResponse,
} from '@/types/domain';

export const paymentApi = {
  createIntent: async (data: CreatePaymentIntentRequest): Promise<PaymentIntentResponse> => {
    const response = await axiosInstance.post<ApiResponse<PaymentIntentResponse>>('/api/v1/payments/intents', data, {
      headers: { 'Idempotency-Key': newIdempotencyKey() },
    });
    return response.data.data;
  },

  createLink: async (data: CreatePaymentLinkRequest): Promise<PaymentLinkResponse> => {
    const response = await axiosInstance.post<ApiResponse<PaymentLinkResponse>>('/api/v1/payments/links', data);
    return response.data.data;
  },
};
