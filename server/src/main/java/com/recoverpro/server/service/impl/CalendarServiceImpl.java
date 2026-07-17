package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.CapacityConfigRequest;
import com.recoverpro.server.dto.request.HolidayRequest;
import com.recoverpro.server.entity.AgentCapacityConfig;
import com.recoverpro.server.entity.HolidayCalendar;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.repository.AgentCapacityConfigRepository;
import com.recoverpro.server.repository.HolidayCalendarRepository;
import com.recoverpro.server.service.CalendarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CalendarServiceImpl implements CalendarService {

    private final HolidayCalendarRepository holidayCalendarRepository;
    private final AgentCapacityConfigRepository agentCapacityConfigRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean isAssignableDate(LocalDate date, UUID organizationId) {
        AgentCapacityConfig config = agentCapacityConfigRepository
                .findByOrganizationId(organizationId)
                .orElseGet(() -> AgentCapacityConfig.builder().organizationId(organizationId).build());

        DayOfWeek dow = date.getDayOfWeek();
        boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);

        if (isWeekend && Boolean.FALSE.equals(config.getAllowWeekendAssignments())) {
            log.debug("Date {} is a weekend and weekend assignments are disabled for org {}", date, organizationId);
            return false;
        }

        if (Boolean.FALSE.equals(config.getAllowHolidayAssignments())) {
            boolean isHoliday = holidayCalendarRepository
                    .existsByOrganizationIdAndHolidayDateAndIsActiveTrue(organizationId, date);
            if (isHoliday) {
                log.debug("Date {} is a holiday and holiday assignments are disabled for org {}", date, organizationId);
                return false;
            }
        }

        return true;
    }

    @Override
    @Transactional
    public HolidayCalendar addHoliday(HolidayRequest request) {
        if (holidayCalendarRepository.existsByOrganizationIdAndHolidayDateAndIsActiveTrue(
                request.getOrganizationId(), request.getHolidayDate())) {
            throw new BusinessException("Holiday already exists for date: " + request.getHolidayDate());
        }
        HolidayCalendar holiday = HolidayCalendar.builder()
                .organizationId(request.getOrganizationId())
                .holidayDate(request.getHolidayDate())
                .description(request.getDescription())
                .isActive(true)
                .build();
        HolidayCalendar saved = holidayCalendarRepository.save(holiday);
        log.info("Holiday added: {} for org {}", request.getHolidayDate(), request.getOrganizationId());
        return saved;
    }

    @Override
    @Transactional
    public void removeHoliday(UUID holidayId) {
        HolidayCalendar holiday = holidayCalendarRepository.findById(holidayId)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday not found: " + holidayId));
        holiday.setIsActive(false);
        holidayCalendarRepository.save(holiday);
        log.info("Holiday deactivated: id={}", holidayId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<HolidayCalendar> getHolidays(UUID organizationId, Pageable pageable) {
        return holidayCalendarRepository
                .findByOrganizationIdAndIsActiveTrueOrderByHolidayDateAsc(organizationId, pageable);
    }

    @Override
    @Transactional
    public AgentCapacityConfig upsertCapacityConfig(CapacityConfigRequest request) {
        AgentCapacityConfig config = agentCapacityConfigRepository
                .findByOrganizationId(request.getOrganizationId())
                .orElseGet(() -> AgentCapacityConfig.builder()
                        .organizationId(request.getOrganizationId()).build());
        config.setMaxCasesPerAgentPerDay(request.getMaxCasesPerAgentPerDay());
        config.setAllowWeekendAssignments(request.getAllowWeekendAssignments());
        config.setAllowHolidayAssignments(request.getAllowHolidayAssignments());
        AgentCapacityConfig saved = agentCapacityConfigRepository.save(config);
        log.info("Capacity config upserted for org {}: maxCases={}", request.getOrganizationId(),
                request.getMaxCasesPerAgentPerDay());
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public AgentCapacityConfig getCapacityConfig(UUID organizationId) {
        return agentCapacityConfigRepository.findByOrganizationId(organizationId)
                .orElseGet(() -> AgentCapacityConfig.builder()
                        .organizationId(organizationId)
                        .maxCasesPerAgentPerDay(50)
                        .allowWeekendAssignments(false)
                        .allowHolidayAssignments(false)
                        .build());
    }

    @Override
    @Transactional(readOnly = true)
    public int getMaxCasesPerAgentPerDay(UUID organizationId) {
        return agentCapacityConfigRepository.findByOrganizationId(organizationId)
                .map(AgentCapacityConfig::getMaxCasesPerAgentPerDay)
                .orElse(50);
    }
}
