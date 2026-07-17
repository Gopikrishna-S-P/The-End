package com.recoverpro.server.scheduler;

import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.service.NpaService;
import com.recoverpro.server.service.SnapshotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonthlySnapshotSchedulerTest {

    @Mock private SnapshotService snapshotService;
    @Mock private NpaService npaService;
    @Mock private OrganizationRepository organizationRepository;

    private MonthlySnapshotScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new MonthlySnapshotScheduler(snapshotService, npaService, organizationRepository);
    }

    @Test
    void captureDailyAgentSnapshots_capturesForEachActiveOrgOnly() {
        Organization active = new Organization();
        active.setId(UUID.randomUUID());
        active.setActive(true);
        Organization inactive = new Organization();
        inactive.setId(UUID.randomUUID());
        inactive.setActive(false);
        when(organizationRepository.findAll()).thenReturn(List.of(active, inactive));

        scheduler.captureDailyAgentSnapshots();

        verify(snapshotService, times(1)).captureAgentPerformanceSnapshot(eq(active.getId()), any(LocalDate.class));
        verify(snapshotService, never()).captureAgentPerformanceSnapshot(eq(inactive.getId()), any(LocalDate.class));
    }

    @Test
    void flagOverdueNpaRecords_flagsForEachActiveOrgOnly() {
        Organization active = new Organization();
        active.setId(UUID.randomUUID());
        active.setActive(true);
        Organization inactive = new Organization();
        inactive.setId(UUID.randomUUID());
        inactive.setActive(false);
        when(organizationRepository.findAll()).thenReturn(List.of(active, inactive));

        scheduler.flagOverdueNpaRecords();

        verify(npaService, times(1)).flagOverdueAllocations(active.getId());
        verify(npaService, never()).flagOverdueAllocations(inactive.getId());
    }
}
