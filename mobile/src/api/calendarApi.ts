import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface HolidayCalendar {
  id: string;
  organizationId: string;
  holidayDate: string;
  description?: string;
}

export interface AgentCapacityConfig {
  id?: string;
  organizationId: string;
  maxCasesPerAgentPerDay: number;
  allowWeekendAssignments: boolean;
  allowHolidayAssignments: boolean;
}

export const calendarApi = {
  getHolidays: async (orgId: string, page = 0, size = 20): Promise<PagedResponse<HolidayCalendar>> => {
    const res = await axiosInstance.get<ApiResponse<PagedResponse<HolidayCalendar>>>(
      '/api/v1/calendar/holidays', { params: { orgId, page, size } },
    );
    return res.data.data;
  },

  getCapacityConfig: async (orgId: string): Promise<AgentCapacityConfig> => {
    const res = await axiosInstance.get<ApiResponse<AgentCapacityConfig>>(
      '/api/v1/calendar/config', { params: { orgId } },
    );
    return res.data.data;
  },
};
