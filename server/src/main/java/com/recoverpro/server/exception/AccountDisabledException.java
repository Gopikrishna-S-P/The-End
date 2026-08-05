package com.recoverpro.server.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class AccountDisabledException extends AuthServiceException {
    public AccountDisabledException(String message) { super(message); }
}
