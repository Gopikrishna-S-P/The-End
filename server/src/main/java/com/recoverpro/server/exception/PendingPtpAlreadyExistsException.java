package com.recoverpro.server.exception;

import com.recoverpro.server.common.exception.BusinessException;

/**
 * Thrown when a PTP is created for an allocation that already has one PENDING. Kept as its own
 * type (rather than a plain BusinessException) so callers that need to distinguish "this action
 * genuinely conflicts" from "this is a duplicate of something that already succeeded" (e.g. an
 * offline-sync replay) can do so without parsing the message.
 */
public class PendingPtpAlreadyExistsException extends BusinessException {
    public PendingPtpAlreadyExistsException(String message) {
        super(message);
    }
}
