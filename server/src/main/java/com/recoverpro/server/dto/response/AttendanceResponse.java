package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AttendanceResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private LocalDate attendanceDate;
    private Instant checkedInAt;
    private Double lat;
    private Double lng;
    private Double accuracy;
    private boolean alreadyRecorded;
}
