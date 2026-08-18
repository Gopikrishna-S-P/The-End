package com.recoverpro.server.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileParsingService {

    /**
     * Parses the file and invokes {@code handler} once per header set and once per data row,
     * without ever materializing the full row set in memory. Throws
     * {@link com.recoverpro.server.exception.FileParsingException} if the file has no header row.
     */
    void streamFile(MultipartFile file, RowHandler handler);
}
