import { apiClient } from '../client';

export type RequestedRole = 'ORG_ADMIN' | 'ORG_USER';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserCreationRequest {
  id: string;
  requestedEmail: string;
  requestedFirstName: string;
  requestedLastName: string;
  requestedRole: RequestedRole;
  requestedById: string;
  requestedByName: string;
  status: RequestStatus;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdUserId?: string;
  createdAt: string;
}

export interface SubmitRequestPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: RequestedRole;
  notes?: string;
}

export interface ReviewPayload {
  approved: boolean;
  notes?: string;
}

export interface PagedUserRequests {
  content: UserCreationRequest[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

const BASE = '/api/v1/user-requests';

export const userRequestsApi = {
  submit: (payload: SubmitRequestPayload) =>
    apiClient.post<{ data: UserCreationRequest }>(BASE, payload),

  listPending: (page = 0, size = 20) =>
    apiClient.get<{ data: PagedUserRequests }>(`${BASE}/pending`, { params: { page, size } }),

  listMine: (page = 0, size = 20) =>
    apiClient.get<{ data: PagedUserRequests }>(`${BASE}/mine`, { params: { page, size } }),

  pendingCount: () =>
    apiClient.get<{ data: number }>(`${BASE}/pending-count`),

  review: (id: string, payload: ReviewPayload) =>
    apiClient.patch<{ data: UserCreationRequest }>(`${BASE}/${id}/review`, payload),
};
