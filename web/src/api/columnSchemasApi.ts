import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

export interface ColumnSchemaResponse {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  isSearchable: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ColumnSchemaRequest {
  organizationId: string;
  name: string;
  displayName: string;
  dataType: string;
  isRequired?: boolean;
  isSearchable?: boolean;
  sortOrder?: number;
}

export const columnSchemasApi = {
  list: async (organizationId: string): Promise<ColumnSchemaResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<ColumnSchemaResponse[]>>(
      '/api/v1/column-schemas',
      { params: { organizationId } },
    );
    return response.data.data ?? [];
  },

  create: async (data: ColumnSchemaRequest): Promise<ColumnSchemaResponse> => {
    const response = await axiosInstance.post<ApiResponse<ColumnSchemaResponse>>(
      '/api/v1/column-schemas',
      data,
    );
    return response.data.data;
  },

  update: async (id: string, data: ColumnSchemaRequest): Promise<ColumnSchemaResponse> => {
    const response = await axiosInstance.put<ApiResponse<ColumnSchemaResponse>>(
      `/api/v1/column-schemas/${id}`,
      data,
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/column-schemas/${id}`);
  },
};
