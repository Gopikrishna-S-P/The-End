package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.AttendanceCheckInRequest;
import com.recoverpro.server.dto.response.AttendanceResponse;
import com.recoverpro.server.entity.DailyAttendance;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.repository.DailyAttendanceRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceServiceImpl implements AttendanceService {

    private final DailyAttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public AttendanceResponse checkIn(UUID userId, UUID orgId, AttendanceCheckInRequest request) {
        LocalDate today = LocalDate.now();

        return attendanceRepository.findByUserIdAndAttendanceDate(userId, today)
                .map(existing -> toResponse(existing, userName(userId), true))
                .orElseGet(() -> {
                    Instant now = Instant.now();
                    attendanceRepository.upsertCheckIn(
                            userId, orgId, today, now,
                            request.getLat(), request.getLng(), request.getAccuracy());

                    DailyAttendance saved = attendanceRepository
                            .findByUserIdAndAttendanceDate(userId, today)
                            .orElseGet(() -> DailyAttendance.builder()
                                    .userId(userId).orgId(orgId)
                                    .attendanceDate(today).checkedInAt(now)
                                    .lat(request.getLat()).lng(request.getLng())
                                    .accuracy(request.getAccuracy())
                                    .build());

                    log.info("Attendance recorded: user={} date={}", userId, today);
                    return toResponse(saved, userName(userId), false);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AttendanceResponse> getByOrgAndDate(UUID orgId, LocalDate date, Pageable pageable) {
        Page<DailyAttendance> page = attendanceRepository.findByOrgIdAndAttendanceDate(orgId, date, pageable);
        Map<UUID, String> names = buildNameMap(
                page.getContent().stream().map(DailyAttendance::getUserId).collect(Collectors.toList()));
        return page.map(a -> toResponse(a, names.getOrDefault(a.getUserId(), "Unknown"), false));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceResponse> getMyAttendance(UUID userId, LocalDate from, LocalDate to) {
        List<DailyAttendance> records = attendanceRepository.findByUserIdAndAttendanceDateBetween(userId, from, to);
        String name = records.isEmpty() ? "" : userName(userId);
        return records.stream().map(a -> toResponse(a, name, false)).collect(Collectors.toList());
    }

    private Map<UUID, String> buildNameMap(List<UUID> userIds) {
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u.getFirstName() + " " + u.getLastName()));
    }

    private String userName(UUID userId) {
        return userRepository.findById(userId)
                .map(u -> u.getFirstName() + " " + u.getLastName())
                .orElse("Unknown");
    }

    private AttendanceResponse toResponse(DailyAttendance a, String userName, boolean alreadyRecorded) {
        return AttendanceResponse.builder()
                .id(a.getId())
                .userId(a.getUserId())
                .userName(userName)
                .attendanceDate(a.getAttendanceDate())
                .checkedInAt(a.getCheckedInAt())
                .lat(a.getLat())
                .lng(a.getLng())
                .accuracy(a.getAccuracy())
                .alreadyRecorded(alreadyRecorded)
                .build();
    }
}
