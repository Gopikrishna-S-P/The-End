package com.recoverpro.server.repository;

import com.recoverpro.server.entity.SchedulerJobRun;
import com.recoverpro.server.enums.JobRunStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SchedulerJobRunRepository extends JpaRepository<SchedulerJobRun, UUID> {

    Page<SchedulerJobRun> findByJobNameOrderByStartedAtDesc(String jobName, Pageable pageable);

    Optional<SchedulerJobRun> findFirstByJobNameOrderByStartedAtDesc(String jobName);

    List<SchedulerJobRun> findByJobNameAndStatus(String jobName, JobRunStatus status);

    List<SchedulerJobRun> findByStartedAtAfter(Instant since);
}
