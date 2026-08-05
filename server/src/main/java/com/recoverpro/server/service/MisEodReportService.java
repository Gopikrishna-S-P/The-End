package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.FoDayReportResponse;
import com.recoverpro.server.dto.response.MisEodReportResponse;

import java.time.LocalDate;
import java.util.UUID;

public interface MisEodReportService {

    MisEodReportResponse generate(UUID orgId, LocalDate date);

    FoDayReportResponse getFoDay(UUID orgId, UUID agentId, LocalDate date);

    void runScheduled(LocalDate date);
}
