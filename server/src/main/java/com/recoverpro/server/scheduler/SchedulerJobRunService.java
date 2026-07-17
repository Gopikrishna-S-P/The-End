package com.recoverpro.server.scheduler;

import com.recoverpro.server.entity.SchedulerJobRun;
import com.recoverpro.server.enums.JobRunStatus;
import com.recoverpro.server.repository.SchedulerJobRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Records scheduler job executions for operational observability.
 * Each method uses REQUIRES_NEW so records are committed independently
 * of the job's own transaction state.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SchedulerJobRunService {

    private final SchedulerJobRunRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UUID start(String jobName) {
        SchedulerJobRun run = repository.save(SchedulerJobRun.builder()
                .jobName(jobName)
                .status(JobRunStatus.RUNNING)
                .startedAt(Instant.now())
                .build());
        return run.getId();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void complete(UUID runId, int rowsProcessed) {
        repository.findById(runId).ifPresent(run -> {
            run.setStatus(JobRunStatus.SUCCESS);
            run.setFinishedAt(Instant.now());
            run.setRowsProcessed(rowsProcessed);
            repository.save(run);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void fail(UUID runId, String errorMessage) {
        repository.findById(runId).ifPresent(run -> {
            run.setStatus(JobRunStatus.FAILED);
            run.setFinishedAt(Instant.now());
            run.setErrorMessage(errorMessage != null
                    ? errorMessage.substring(0, Math.min(errorMessage.length(), 2000)) : null);
            repository.save(run);
        });
    }
}
