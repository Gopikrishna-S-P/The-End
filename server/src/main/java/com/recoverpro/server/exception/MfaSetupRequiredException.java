package com.recoverpro.server.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class MfaSetupRequiredException extends AuthServiceException {
    public MfaSetupRequiredException(String message) { super(message); }
}
