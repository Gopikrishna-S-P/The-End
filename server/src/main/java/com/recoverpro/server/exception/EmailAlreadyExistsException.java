package com.recoverpro.server.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class EmailAlreadyExistsException extends AuthServiceException {
    public EmailAlreadyExistsException(String message) { super(message); }
}
