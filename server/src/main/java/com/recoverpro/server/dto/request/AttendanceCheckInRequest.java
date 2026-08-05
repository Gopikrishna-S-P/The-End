package com.recoverpro.server.dto.request;

import lombok.Data;

@Data
public class AttendanceCheckInRequest {
    private Double lat;
    private Double lng;
    private Double accuracy;
}
