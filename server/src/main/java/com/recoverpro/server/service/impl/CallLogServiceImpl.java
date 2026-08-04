package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.LogMask;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CompleteCallRequest;
import com.recoverpro.server.dto.response.AllocationResponse;
import com.recoverpro.server.dto.response.CallLogResponse;
import com.recoverpro.server.dto.response.CallStartResponse;
import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.CallLog;
import com.recoverpro.server.enums.RecordingStatus;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.repository.CallLogRepository;
import com.recoverpro.server.service.AllocationService;
import com.recoverpro.server.service.CallLogService;
import com.recoverpro.server.service.storage.StoragePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CallLogServiceImpl implements CallLogService {

    private static final long MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac"
    );

    private final CallLogRepository callLogRepository;
    private final AllocationService allocationService;
    private final BorrowerRepository borrowerRepository;
    private final StoragePort storagePort;
    private final CallLogFailureRecorder callLogFailureRecorder;

    @Override
    @Transactional
    public CallStartResponse startCall(UUID allocationId, UUID agentId, UUID organizationId) {
        AllocationResponse allocation = requireAllocationInOrg(allocationId, organizationId);

        Borrower borrower = borrowerRepository.findById(allocation.getBorrowerId())
                .orElseThrow(() -> new ResourceNotFoundException("Borrower", allocation.getBorrowerId()));
        String phone = borrower.getPhone();
        if (phone == null || phone.isBlank()) {
            throw new BusinessException("This borrower has no phone number on file.");
        }

        CallLog callLog = CallLog.builder()
                .organizationId(organizationId)
                .allocationId(allocationId)
                .agentId(agentId)
                .initiatedAt(Instant.now())
                .phoneMasked(LogMask.phone(phone))
                .recordingStatus(RecordingStatus.PENDING)
                .build();
        CallLog saved = callLogRepository.save(callLog);
        log.info("Call started: id={} allocation={} agent={}", saved.getId(), allocationId, agentId);

        return CallStartResponse.builder()
                .callLogId(saved.getId())
                .phoneNumber(phone)
                .build();
    }

    @Override
    @Transactional
    public void attachRecording(UUID callLogId, UUID organizationId, MultipartFile file) {
        CallLog callLog = requireCallLogInOrg(callLogId, organizationId);
        validateFile(file);

        String filename = callLogId + ".m4a";
        String s3Key = "call-recordings/" + organizationId + "/" + callLog.getAllocationId() + "/" + filename;
        Path localPath = Paths.get("./uploads/call-recordings", organizationId.toString(),
                callLog.getAllocationId().toString()).resolve(filename);

        String storedPath;
        try {
            storedPath = storagePort.store(s3Key, localPath, file.getInputStream(), file.getContentType(), file.getSize());
        } catch (Exception e) {
            log.error("Failed to store call recording for callLog {}: {}", callLogId, e.getMessage(), e);
            callLogFailureRecorder.markFailed(callLogId);
            throw new BusinessException("Failed to store call recording: " + e.getMessage());
        }

        callLog.setRecordingPath(storedPath);
        callLog.setRecordingStatus(RecordingStatus.UPLOADED);
        callLogRepository.save(callLog);
        log.info("Call recording stored: callLogId={} location={}", callLogId, storedPath);
    }

    @Override
    @Transactional
    public CallLogResponse completeCall(UUID callLogId, UUID organizationId, CompleteCallRequest request) {
        CallLog callLog = requireCallLogInOrg(callLogId, organizationId);
        callLog.setEndedAt(Instant.now());
        callLog.setOutcome(request.getOutcome());
        callLog.setNotes(request.getNotes());
        callLog.setDurationSeconds(request.getDurationSeconds());
        if (callLog.getRecordingStatus() == RecordingStatus.PENDING) {
            callLog.setRecordingStatus(RecordingStatus.NOT_RECORDED);
        }
        CallLog saved = callLogRepository.save(callLog);
        log.info("Call completed: id={} outcome={}", callLogId, request.getOutcome());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CallLogResponse> getByAllocation(UUID allocationId, UUID organizationId) {
        requireAllocationInOrg(allocationId, organizationId);
        return callLogRepository.findByAllocationIdOrderByInitiatedAtDesc(allocationId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private AllocationResponse requireAllocationInOrg(UUID allocationId, UUID organizationId) {
        AllocationResponse allocation = allocationService.getAllocationById(allocationId);
        if (allocation.getOrganizationId() == null || !allocation.getOrganizationId().equals(organizationId)) {
            throw new ResourceNotFoundException("Allocation not found");
        }
        return allocation;
    }

    private CallLog requireCallLogInOrg(UUID callLogId, UUID organizationId) {
        CallLog callLog = callLogRepository.findById(callLogId)
                .orElseThrow(() -> new ResourceNotFoundException("Call log not found"));
        if (!callLog.getOrganizationId().equals(organizationId)) {
            throw new ResourceNotFoundException("Call log not found");
        }
        return callLog;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BusinessException("Recording file must not be empty");
        if (file.getSize() > MAX_FILE_SIZE_BYTES)
            throw new BusinessException("Recording exceeds maximum allowed size of 20 MB");
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_CONTENT_TYPES.contains(ct.toLowerCase()))
            throw new BusinessException("Unsupported recording file type: " + ct);
    }

    private CallLogResponse toResponse(CallLog callLog) {
        return CallLogResponse.builder()
                .id(callLog.getId())
                .allocationId(callLog.getAllocationId())
                .agentId(callLog.getAgentId())
                .initiatedAt(callLog.getInitiatedAt())
                .endedAt(callLog.getEndedAt())
                .durationSeconds(callLog.getDurationSeconds())
                .outcome(callLog.getOutcome())
                .phoneMasked(callLog.getPhoneMasked())
                .notes(callLog.getNotes())
                .recordingStatus(callLog.getRecordingStatus())
                .build();
    }
}
