package com.recoverpro.server.service;

import com.recoverpro.server.entity.Allocation;

import java.util.List;

public interface AllocationSearchIndexService {
    void reindex(Allocation allocation);
    void reindexAll(List<Allocation> allocations);
}
