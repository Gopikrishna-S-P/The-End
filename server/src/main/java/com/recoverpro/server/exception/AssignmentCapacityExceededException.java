package com.recoverpro.server.exception;

public class AssignmentCapacityExceededException extends RuntimeException {
    public AssignmentCapacityExceededException(String message) {
        super(message);
    }
}
