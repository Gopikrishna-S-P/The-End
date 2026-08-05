package com.recoverpro.server.repository;

import com.recoverpro.server.entity.HolidayCalendar;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HolidayCalendarRepository extends JpaRepository<HolidayCalendar, UUID> {

    boolean existsByOrganizationIdAndHolidayDateAndIsActiveTrue(UUID organizationId, LocalDate date);

    Optional<HolidayCalendar> findByOrganizationIdAndHolidayDate(UUID organizationId, LocalDate date);

    Page<HolidayCalendar> findByOrganizationIdAndIsActiveTrueOrderByHolidayDateAsc(
            UUID organizationId, Pageable pageable);
}
