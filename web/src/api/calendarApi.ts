import axiosInstance from './axiosInstance';
import type {
  ApiResponse, PagedResponse,
  HolidayCalendar, HolidayRequest,
  AgentCapacityConfig, CapacityConfigRequest,
} from '../types';

// Matches server/src/main/java/com/recoverpro/server/controller/CalendarController.java
// (/api/v1/calendar) exactly — 6 endpoints, no more, no less.
//
// Role gates (from @PreAuthorize on the controller):
//   ADMINS  = PLATFORM_ADMIN, ORG_ADMIN          → write endpoints (add/remove holiday, upsert config)
//   READERS = PLATFORM_ADMIN, ORG_ADMIN, MANAGER, TL → read endpoints

export const calendarApi = {
  /** POST /api/v1/calendar/holidays — ADMINS only. 201 Created. */
  addHoliday: async (data: HolidayRequest): Promise<HolidayCalendar> => {
    const res = await axiosInstance.post<ApiResponse<HolidayCalendar>>(
      '/api/v1/calendar/holidays', data,
    );
    return res.data.data;
  },

  /** DELETE /api/v1/calendar/holidays/{id} — ADMINS only. Soft-deactivates (isActive=false). */
  removeHoliday: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/calendar/holidays/${id}`);
  },

  /** GET /api/v1/calendar/holidays?orgId=&page=&size= — READERS. Sorted by holidayDate asc. */
  getHolidays: async (orgId: string, page = 0, size = 20): Promise<PagedResponse<HolidayCalendar>> => {
    const res = await axiosInstance.get<ApiResponse<PagedResponse<HolidayCalendar>>>(
      '/api/v1/calendar/holidays', { params: { orgId, page, size } },
    );
    return res.data.data;
  },

  /** GET /api/v1/calendar/check?date=YYYY-MM-DD&orgId= — READERS. True if the date is assignable. */
  checkAssignableDate: async (date: string, orgId: string): Promise<boolean> => {
    const res = await axiosInstance.get<ApiResponse<boolean>>(
      '/api/v1/calendar/check', { params: { date, orgId } },
    );
    return res.data.data;
  },

  /** PUT /api/v1/calendar/config — ADMINS only. Upserts (creates if absent). */
  upsertCapacityConfig: async (data: CapacityConfigRequest): Promise<AgentCapacityConfig> => {
    const res = await axiosInstance.put<ApiResponse<AgentCapacityConfig>>(
      '/api/v1/calendar/config', data,
    );
    return res.data.data;
  },

  /** GET /api/v1/calendar/config?orgId= — READERS. Never 404s — returns synthesized defaults
   *  (maxCasesPerAgentPerDay=50, allowWeekend=false, allowHoliday=false) when no row exists. */
  getCapacityConfig: async (orgId: string): Promise<AgentCapacityConfig> => {
    const res = await axiosInstance.get<ApiResponse<AgentCapacityConfig>>(
      '/api/v1/calendar/config', { params: { orgId } },
    );
    return res.data.data;
  },
};
