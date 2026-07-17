package com.recoverpro.server.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a client reuses an Idempotency-Key against a different resource
 * than the one originally bound to that key. Per design-doc.md §5.4:
 * "mismatched body on same key → 409".
 *
 * (We narrow this to "mismatched resource" for v1 -- full request-body hashing
 * is a follow-up.)
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class IdempotencyKeyConflictException extends RuntimeException {
    public IdempotencyKeyConflictException(String message) {
        super(message);
    }
}
