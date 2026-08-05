package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.request.AttendanceCheckInRequest;
import com.recoverpro.server.dto.response.AttendanceResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<AttendanceResponse>> checkIn(
            @RequestBody(required = false) AttendanceCheckInRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (request == null) request = new AttendanceCheckInRequest();
        AttendanceResponse response = attendanceService.checkIn(
                principal.getId(), principal.getOrganizationId(), request);
        HttpStatus status = response.isAlreadyRecorded() ? HttpStatus.OK : HttpStatus.CREATED;
        String message = response.isAlreadyRecorded()
                ? "Attendance already recorded for today" : "Attendance recorded";
        return ResponseEntity.status(status).body(ApiResponse.of(message, response));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL')")
    public ResponseEntity<ApiResponse<PagedResponse<AttendanceResponse>>> getByOrgAndDate(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @PageableDefault(size = 20) Pageable pageable) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        Page<AttendanceResponse> page = attendanceService.getByOrgAndDate(
                principal.getOrganizationId(), queryDate, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(page)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> getMyAttendance(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now();
        LocalDate start = from != null ? from : end.minusDays(29);
        if (start.isBefore(end.minusDays(29))) start = end.minusDays(29);
        return ResponseEntity.ok(ApiResponse.success(
                attendanceService.getMyAttendance(principal.getId(), start, end)));
    }
}
