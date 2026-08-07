import type { AxiosRequestConfig } from 'axios';
import axiosInstance, {
  getRefreshToken, getUserCache, setUserCache, getUserEtag, setUserEtag,
} from './axiosInstance';
import type {
  AuthResponse, LoginRequest, ForgotPasswordRequest,
  ResetPasswordRequest, ChangePasswordRequest, EnableMfaRequest,
  MfaSetupResponse, MfaEnableResponse, ApiResponse, UserResponse,
  AuthSessionResponse,
} from '../types';

export const authApi = {
  // Sends If-None-Match; returns cached user on 304 to avoid re-parsing JWT claims.
  me: async (): Promise<UserResponse> => {
    const storedEtag = getUserEtag();
    const headers: Record<string, string> = {};
    if (storedEtag) headers['If-None-Match'] = storedEtag;

    const response = await axiosInstance.get<ApiResponse<UserResponse>>('/api/v1/auth/me', {
      headers,
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    });

    if (response.status === 304) {
      const cached = getUserCache();
      if (cached) return JSON.parse(cached) as UserResponse;
      // Cache miss despite 304 — fall back to a fresh unconditional fetch
      const fresh = await axiosInstance.get<ApiResponse<UserResponse>>('/api/v1/auth/me');
      const etag = fresh.headers['etag'];
      if (etag) setUserEtag(etag);
      return fresh.data.data;
    }

    const etag = response.headers['etag'];
    if (etag) setUserEtag(etag);
    const user = response.data.data;
    setUserCache(user);
    return user;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', data);
    return response.data.data;
  },

  refresh: async (refreshToken: string, config?: AxiosRequestConfig): Promise<AuthResponse> => {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>('/api/v1/auth/refresh', { refreshToken }, config);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post('/api/v1/auth/logout', { refreshToken: getRefreshToken() });
  },

  logoutAll: async (): Promise<void> => {
    await axiosInstance.post('/api/v1/auth/logout-all');
  },

  listSessions: async (): Promise<AuthSessionResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<AuthSessionResponse[]>>('/api/v1/auth/sessions');
    return response.data.data;
  },

  revokeSession: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/auth/sessions/${id}`);
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    await axiosInstance.post('/api/v1/auth/forgot-password', data);
  },

  verifyResetOtp: async (data: { email: string; otp: string }): Promise<void> => {
    await axiosInstance.post('/api/v1/auth/verify-reset-otp', data);
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    await axiosInstance.post('/api/v1/auth/reset-password', data);
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await axiosInstance.post('/api/v1/auth/change-password', data);
  },

  setupMfa: async (): Promise<MfaSetupResponse> => {
    const response = await axiosInstance.post<ApiResponse<MfaSetupResponse>>('/api/v1/auth/mfa/setup');
    return response.data.data;
  },

  enableMfa: async (data: EnableMfaRequest): Promise<MfaEnableResponse> => {
    const response = await axiosInstance.post<ApiResponse<MfaEnableResponse>>('/api/v1/auth/mfa/enable', data);
    return response.data.data;
  },

  disableMfa: async (totpCode: string): Promise<void> => {
    await axiosInstance.post('/api/v1/auth/mfa/disable', { totpCode });
  },
};
