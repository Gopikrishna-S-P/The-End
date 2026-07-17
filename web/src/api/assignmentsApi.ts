import axiosInstance from './axiosInstance';
import type { AssignmentResponse, BulkAssignRequest, ApiResponse, PagedResponse } from '../types';

interface ReassignRequest {
  newAgentId: string;
  assignmentDate: string;
  reason: string;
}

interface AgentAssignmentSummary {
  agentId: string;
  totalAssigned: number;
  completed: number;
  pending: number;
}

interface DateAssignmentSummary {
  date: string;
  totalAssignments: number;
  completed: number;
  pending: number;
}

export const assignmentsApi = {
  bulkAssign: async (data: BulkAssignRequest): Promise<any> => {
    const response = await axiosInstance.post<ApiResponse<any>>('/api/v1/assignments/bulk', data);
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

  getAgentSummary: async (agentId: string, date?: string, orgId?: string): Promise<AgentAssignmentSummary> => {
    const response = await axiosInstance.get<ApiResponse<AgentAssignmentSummary>>(`/api/v1/assignments/summary/agent/${agentId}`, {
      params: { date, orgId },
    });
    return response.data.data;
  },

  getDateSummary: async (date: string, orgId?: string): Promise<DateAssignmentSummary> => {
    const response = await axiosInstance.get<ApiResponse<DateAssignmentSummary>>('/api/v1/assignments/summary/date', {
      params: { date, orgId },
    });
    return response.data.data;
  },

  getAgentCapacity: async (agentId: string, date?: string, orgId?: string): Promise<number> => {
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

  cancelAssignment: async (id: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/assignments/${id}/cancel`);
  },

  deleteAssignment: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/assignments/${id}`);
  },

  getBankAssignments: async (params: {
    orgId?: string;
    agentId?: string;
    date?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<any>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<any>>>('/api/v1/assignments/bank', { params });
    return response.data.data;
  },
};
