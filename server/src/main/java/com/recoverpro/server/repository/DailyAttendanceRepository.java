package com.recoverpro.server.repository;

import com.recoverpro.server.entity.DailyAttendance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DailyAttendanceRepository extends JpaRepository<DailyAttendance, UUID> {

    Optional<DailyAttendance> findByUserIdAndAttendanceDate(UUID userId, LocalDate date);

    boolean existsByUserIdAndAttendanceDate(UUID userId, LocalDate date);

    Page<DailyAttendance> findByOrgIdAndAttendanceDate(UUID orgId, LocalDate date, Pageable pageable);

    List<DailyAttendance> findByUserIdAndAttendanceDateBetween(UUID userId, LocalDate from, LocalDate to);

    List<DailyAttendance> findByOrgIdAndAttendanceDateBetweenOrderByAttendanceDateDesc(
            UUID orgId, LocalDate from, LocalDate to);

    @Modifying
    @Query(value = "INSERT INTO daily_attendance (id, user_id, org_id, attendance_date, checked_in_at, lat, lng, accuracy) " +
                   "VALUES (gen_random_uuid(), :userId, :orgId, :date, :checkedInAt, :lat, :lng, :accuracy) " +
                   "ON CONFLICT (user_id, attendance_date) DO NOTHING",
           nativeQuery = true)
    void upsertCheckIn(@Param("userId") UUID userId, @Param("orgId") UUID orgId,
                       @Param("date") LocalDate date, @Param("checkedInAt") Instant checkedInAt,
                       @Param("lat") Double lat, @Param("lng") Double lng,
                       @Param("accuracy") Double accuracy);
}
