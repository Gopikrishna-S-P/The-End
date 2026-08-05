package com.recoverpro.server.exception;

public class SessionInactiveException extends RuntimeException {
    public SessionInactiveException(String message) { super(message); }
}
