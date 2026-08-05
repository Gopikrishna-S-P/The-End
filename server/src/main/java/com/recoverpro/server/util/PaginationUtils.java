package com.recoverpro.server.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class PaginationUtils {

    public static final int MAX_PAGE_SIZE     = 200;
    public static final int DEFAULT_PAGE_SIZE = 20;

    private PaginationUtils() {}

    public static Pageable of(int page, int size) {
        return PageRequest.of(Math.max(0, page), clamp(size));
    }

    public static Pageable of(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(0, page), clamp(size), sort);
    }

    private static int clamp(int size) {
        return Math.max(1, Math.min(size, MAX_PAGE_SIZE));
    }
}
