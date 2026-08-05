package com.recoverpro.server.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class FileParsingException extends RuntimeException {
    public FileParsingException(String message) {
        super(message);
    }
}
