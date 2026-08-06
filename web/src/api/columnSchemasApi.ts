import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';
import type { UploadType } from '../types/reports';

export interface ColumnSchemaResponse {
  id: string;
  organizationId: string;
  entityType: UploadType;
  name: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  isSearchable: boolean;
  sortOrder: number;
  validationRules?: Record<string, unknown>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ColumnSchemaRequest {
  organizationId: string;
  /** Omitted means ALLOCATION, matching the server default. */
  entityType?: UploadType;
  name: string;
  displayName: string;
  dataType: string;
  isRequired?: boolean;
  isSearchable?: boolean;
  sortOrder?: number;
  validationRules?: Record<string, unknown>;
}

export const columnSchemasApi = {
  /** @param entityType omit to get every entity's columns, as before */
  list: async (organizationId: string, entityType?: UploadType): Promise<ColumnSchemaResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<ColumnSchemaResponse[]>>(
      '/api/v1/column-schemas',
      { params: entityType ? { organizationId, entityType } : { organizationId } },
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
