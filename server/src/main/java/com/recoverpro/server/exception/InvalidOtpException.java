package com.recoverpro.server.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidOtpException extends AuthServiceException {

    private final Long attemptsRemaining;

    public InvalidOtpException(String message) {
        super(message);
        this.attemptsRemaining = null;
    }

    public InvalidOtpException(String message, long attemptsRemaining) {
        super(message);
        this.attemptsRemaining = attemptsRemaining;
    }

    public Long getAttemptsRemaining() { return attemptsRemaining; }
}
