package com.recoverpro.server.service.impl;

import com.recoverpro.server.enums.RecordingStatus;
import com.recoverpro.server.repository.CallLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Persists a recording-failure status in its own transaction, independent of the caller's --
 * a separate bean (rather than a method called via self-invocation) so REQUIRES_NEW actually
 * applies (self-invocation bypasses the Spring AOP proxy, same reasoning as ReportJobExecutor).
 * Needed because CallLogServiceImpl.attachRecording re-throws after a storage failure, which
 * would otherwise roll back its own "mark as FAILED" save along with everything else.
 */
@Component
@RequiredArgsConstructor
public class CallLogFailureRecorder {

    private final CallLogRepository callLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID callLogId) {
        callLogRepository.findById(callLogId).ifPresent(callLog -> {
            callLog.setRecordingStatus(RecordingStatus.FAILED);
            callLogRepository.save(callLog);
        });
    }
}
