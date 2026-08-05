import axiosInstance from './axiosInstance';
import type {
  AssignmentResponse, BulkAssignRequest, BulkAssignResponse,
  AgentAssignmentSummary, DateAssignmentSummary, MyAssignedCaseResponse,
  OptimizeAssignmentOrderRequest, OptimizedAssignmentOrderResponse,
  ApiResponse, PagedResponse,
} from '../types';

interface ReassignRequest {
  newAgentId: string;
  assignmentDate: string;
  reason: string;
  priority?: string;
}

export const assignmentsApi = {
  bulkAssign: async (data: BulkAssignRequest): Promise<BulkAssignResponse> => {
    const response = await axiosInstance.post<ApiResponse<BulkAssignResponse>>('/api/v1/assignments/bulk', data);
    return response.data.data;
  },

  listAssignments: async (params: {
    orgId: string;
    agentId?: string;
    date?: string;
    status?: string;
    priority?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }): Promise<PagedResponse<AssignmentResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AssignmentResponse>>>('/api/v1/assignments', { params });
    return response.data.data;
  },

  getAssignmentById: async (id: string): Promise<AssignmentResponse> => {
    const response = await axiosInstance.get<ApiResponse<AssignmentResponse>>(`/api/v1/assignments/${id}`);
    return response.data.data;
  },

  getAssignmentsByAgent: async (agentId: string, date: string, page = 0, size = 20): Promise<PagedResponse<AssignmentResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AssignmentResponse>>>(`/api/v1/assignments/agent/${agentId}`, {
      params: { date, page, size },
    });
    return response.data.data;
  },

  reassignAssignment: async (id: string, data: ReassignRequest): Promise<AssignmentResponse> => {
    const response = await axiosInstance.patch<ApiResponse<AssignmentResponse>>(`/api/v1/assignments/${id}/reassign`, data);
    return response.data.data;
  },

  /** LEADS-only. `date` is required by the server (no default). */
  getAgentSummary: async (agentId: string, date: string, orgId?: string): Promise<AgentAssignmentSummary> => {
    const response = await axiosInstance.get<ApiResponse<AgentAssignmentSummary>>(`/api/v1/assignments/summary/agent/${agentId}`, {
      params: { date, orgId },
    });
    return response.data.data;
  },

  /** LEADS-only. `date` is required by the server (no default). */
  getDateSummary: async (date: string, orgId?: string): Promise<DateAssignmentSummary> => {
    const response = await axiosInstance.get<ApiResponse<DateAssignmentSummary>>('/api/v1/assignments/summary/date', {
      params: { date, orgId },
    });
    return response.data.data;
  },

  /** LEADS-only. `date` is required by the server (no default). */
  getAgentCapacity: async (agentId: string, date: string, orgId?: string): Promise<number> => {
    const response = await axiosInstance.get<ApiResponse<number>>(`/api/v1/assignments/capacity/agent/${agentId}`, {
      params: { date, orgId },
    });
    return response.data.data;
  },

  getByAllocationId: async (allocationId: string): Promise<AssignmentResponse> => {
    const response = await axiosInstance.get<ApiResponse<AssignmentResponse[]>>(`/api/v1/assignments/allocation/${allocationId}`);
    const list = response.data.data;
    const active = Array.isArray(list)
      ? (list.find(a => a.status === 'PENDING' || a.status === 'IN_PROGRESS') ?? list[0])
      : (list as unknown as AssignmentResponse);
    if (!active) throw new Error('No assignment found for this allocation');
    return active;
  },

  /** Any authenticated caller — server scopes to the caller's own active cases. */
  getMyActiveCases: async (page = 0, size = 20): Promise<PagedResponse<MyAssignedCaseResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<MyAssignedCaseResponse>>>('/api/v1/assignments/my-cases', {
      params: { page, size },
    });
    return response.data.data;
  },

  /** ORG_ADMIN / PLATFORM_ADMIN only — geo-aware visit-order optimizer. */
  optimizeOrder: async (data: OptimizeAssignmentOrderRequest): Promise<OptimizedAssignmentOrderResponse> => {
    const response = await axiosInstance.post<ApiResponse<OptimizedAssignmentOrderResponse>>('/api/v1/assignments/optimize-order', data);
    return response.data.data;
  },

  cancelAssignment: async (id: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/assignments/${id}/cancel`);
  },

  deleteAssignment: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/assignments/${id}`);
  },
};
