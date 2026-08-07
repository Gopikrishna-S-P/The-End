/**
 * Role catalog after the multi-tenant rewrite. Legacy values
 * (FIELD_AGENT / AGENCY_ADMIN / BANK_ADMIN) stay in the union for one release
 * so old JWTs and stored user objects don't crash the UI; new code should
 * branch on the new names (ORG_ADMIN / MANAGER / TL / FO / CALLER / TRACER).
 */
export type Role =
  | 'PLATFORM_ADMIN'
  | 'ORG_ADMIN'
  | 'MANAGER'
  | 'TL'
  | 'FO'
  | 'CALLER'
  | 'TRACER'
  // legacy — to be removed once the backend stops emitting them
  | 'FIELD_AGENT'
  | 'AGENCY_ADMIN'
  | 'BANK_ADMIN';

export type DashboardRole = Role;

export type AllocationStatus = 'UNASSIGNED' | 'ASSIGNED' | 'CLOSED' | 'RESTRUCTURED';
export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'REASSIGNED';
export type CollectionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DEPOSITED' | 'CANCELLED';
export type PtpStatus = 'PENDING' | 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'BROKEN' | 'CANCELLED';
export type PaymentMode = 'CASH' | 'UPI' | 'CHEQUE' | 'NEFT' | 'RTGS';
/** Matches server enums.Priority exactly — server has no CRITICAL value, only URGENT. */
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type FileUploadStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';
export type NpaRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ApprovalAction = 'APPROVE' | 'REJECT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type VisitStatus = 'GPS_UNAVAILABLE' | 'NOT_VERIFIED' | 'VERIFIED' | 'GPS_MISMATCH' | 'MOCK_LOCATION_DETECTED';
export type ReportType = 'AGENT_PERFORMANCE' | 'TEAM_PERFORMANCE' | 'AGENCY_PERFORMANCE' | 'DAILY_VISIT_COMPLETION' | 'COLLECTION_EFFICIENCY' | 'MONTHLY_LOAN_BOOK_SNAPSHOT' | 'BANK_RECONCILIATION' | 'REASSIGNMENT_FREQUENCY' | 'NPA_IDENTIFICATION' | 'MONTHLY_VISIT_COMPLETION' | 'MIS_EOD';
export type ExportFormat = 'PDF' | 'EXCEL';
export type ReportStatus = 'QUEUED' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
  timestamp?: string;
  status?: number;
}

/** Shape of error bodies returned by the server's GlobalExceptionHandler. */
export interface ApiError {
  status: number;
  error: string;
  message: string;
  path?: string;
  timestamp?: string;
  /** Present on 429 (rate-limited) and 403 Account Locked responses. */
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

export interface AuthSessionResponse {
  id: string;
  deviceInfo?: string;
  ipAddress?: string;
  geoCountry?: string;
  createdAt: string;
  expiresAt: string;
  anomalyFlagged: boolean;
  anomalyReason?: string;
  current: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface EnableMfaRequest {
  totpCode: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUri: string;
  manualEntryKey: string;
}

export interface MfaEnableResponse {
  recoveryCodes: string[];
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
  agentId?: string;
  /** Persisted UI theme — "light" | "dark" | "system". */
  themePreference?: 'light' | 'dark' | 'system';
  roles: RoleResponse[];
}

export interface DirectPermissionResponse {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  scope?: string;
  granted: boolean;
  grantedAt?: string;
}

export interface UserPermissionsResponse {
  fromRoles: PermissionResponse[];
  direct: DirectPermissionResponse[];
}

