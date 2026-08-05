package com.recoverpro.server.common;

import org.springframework.data.domain.Sort;

import java.util.Map;

public final class SafeSort {

    private SafeSort() {}

    public static Sort from(String requestedField,
                            String requestedDirection,
                            Map<String, String> allowed,
                            String defaultField) {
        String resolved = requestedField != null
                ? allowed.getOrDefault(requestedField, defaultField)
                : defaultField;
        Sort.Direction direction = "asc".equalsIgnoreCase(requestedDirection)
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(direction, resolved);
    }
}
