package com.recoverpro.server.exception;

public class LlamaUnavailableException extends RuntimeException {
    public LlamaUnavailableException(String message) { super(message); }
    public LlamaUnavailableException(String message, Throwable cause) { super(message, cause); }
}
