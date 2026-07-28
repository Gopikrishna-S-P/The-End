// Ported from web/src/types/core.ts — keep in sync with the backend's
// GlobalExceptionHandler / DTO contracts. Only the subset the Field Officer
// app actually uses is included; extend deliberately, don't bulk-import.

export type Role =
  | 'PLATFORM_ADMIN'
  | 'ORG_ADMIN'
  | 'MANAGER'
  | 'TL'
  | 'FO'
  | 'CALLER'
  | 'TRACER'
  | 'FIELD_AGENT'
  | 'AGENCY_ADMIN'
  | 'BANK_ADMIN';

export type AllocationStatus = 'UNASSIGNED' | 'ASSIGNED' | 'CLOSED' | 'RESTRUCTURED';
export type CollectionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DEPOSITED' | 'CANCELLED';
export type PtpStatus = 'PENDING' | 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'BROKEN' | 'CANCELLED';
export type PaymentMode = 'CASH' | 'UPI' | 'CHEQUE' | 'NEFT' | 'RTGS';
export type VisitStatus = 'GPS_UNAVAILABLE' | 'NOT_VERIFIED' | 'VERIFIED' | 'GPS_MISMATCH' | 'MOCK_LOCATION_DETECTED';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
  timestamp?: string;
  status?: number;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  path?: string;
  timestamp?: string;
  retryAfterSeconds?: number;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
  recoveryCode?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  mfaRequired: boolean;
  mfaSessionToken?: string;
  user: UserResponse;
}

export interface PermissionResponse {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  scope?: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  organizationName?: string;
  systemRole?: boolean;
  permissions: PermissionResponse[];
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  accountLocked: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  organizationId?: string;
  roles: RoleResponse[];
}
