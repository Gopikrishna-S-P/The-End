package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CapacityConfigRequest;
import com.recoverpro.server.dto.request.HolidayRequest;
import com.recoverpro.server.entity.AgentCapacityConfig;
import com.recoverpro.server.entity.HolidayCalendar;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface CalendarService {

    boolean isAssignableDate(LocalDate date, UUID organizationId);

    HolidayCalendar addHoliday(HolidayRequest request);

    void removeHoliday(UUID holidayId);

    Page<HolidayCalendar> getHolidays(UUID organizationId, Pageable pageable);

    AgentCapacityConfig upsertCapacityConfig(CapacityConfigRequest request);

    AgentCapacityConfig getCapacityConfig(UUID organizationId);

    int getMaxCasesPerAgentPerDay(UUID organizationId);
}
