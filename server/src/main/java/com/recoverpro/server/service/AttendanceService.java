package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.AttendanceCheckInRequest;
import com.recoverpro.server.dto.response.AttendanceResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AttendanceService {

    AttendanceResponse checkIn(UUID userId, UUID orgId, AttendanceCheckInRequest request);

    Page<AttendanceResponse> getByOrgAndDate(UUID orgId, LocalDate date, Pageable pageable);

    List<AttendanceResponse> getMyAttendance(UUID userId, LocalDate from, LocalDate to);
}
