// Matches server entity.HolidayCalendar / entity.AgentCapacityConfig and
// dto.request.HolidayRequest / dto.request.CapacityConfigRequest exactly.
// See server/src/main/java/com/recoverpro/server/controller/CalendarController.java

export interface HolidayCalendar {
  id: string;
  organizationId: string;
  holidayDate: string; // ISO LocalDate, e.g. "2026-08-15"
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface HolidayRequest {
  organizationId: string;
  holidayDate: string; // ISO LocalDate
  description?: string;
}

export interface AgentCapacityConfig {
  id?: string; // undefined when the backend returns a synthesized default (no row persisted yet)
  organizationId: string;
  maxCasesPerAgentPerDay: number;
  allowWeekendAssignments: boolean;
  allowHolidayAssignments: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CapacityConfigRequest {
  organizationId: string;
  maxCasesPerAgentPerDay: number;
  allowWeekendAssignments: boolean;
  allowHolidayAssignments: boolean;
}
