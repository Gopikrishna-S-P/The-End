import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export interface ColumnSchemaResponse {
  id: string;
  organizationId: string;
  entityType: string;
  name: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  isSearchable: boolean;
  sortOrder: number;
  isActive: boolean;
}

export const columnSchemasApi = {
  list: async (organizationId: string, entityType?: string): Promise<ColumnSchemaResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<ColumnSchemaResponse[]>>(
      '/api/v1/column-schemas',
      { params: entityType ? { organizationId, entityType } : { organizationId } },
    );
    return response.data.data ?? [];
  },
};
