package com.recoverpro.server.common.exception;

import java.util.UUID;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super("%s not found with %s: '%s'".formatted(resourceName, fieldName, fieldValue));
    }

    public ResourceNotFoundException(String resourceName, UUID id) {
        super("%s not found with id: %s".formatted(resourceName, id));
    }
}
