package com.recoverpro.server.service;

import java.time.LocalDate;
import java.util.UUID;

public interface SnapshotService {

    void captureAgentPerformanceSnapshot(UUID orgId, LocalDate date);

    void captureMonthlyLoanBookSnapshot(UUID orgId, int month, int year);

    int captureAllOrgsMonthlySnapshot(int month, int year);
}
