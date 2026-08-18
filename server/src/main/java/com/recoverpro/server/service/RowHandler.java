package com.recoverpro.server.service;

import java.util.List;
import java.util.Map;

/**
 * Receives parsed rows one at a time so a file's rows never need to be held in memory as a
 * single List for the whole processing run. Headers arrive once, before any row.
 * {@code dataRowIndex} is 0-based over non-blank data rows only (blank rows are skipped without
 * incrementing it), matching the numbering {@code FileProcessingServiceImpl} has always used.
 */
public interface RowHandler {

    void onHeaders(List<String> headers);

    void onRow(Map<String, String> row, int dataRowIndex);
}
