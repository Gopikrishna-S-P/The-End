package com.recoverpro.server.service.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Duration;

/**
 * Single seam for the S3-or-local-disk branching that used to be copy-pasted across
 * DocumentServiceImpl, VisitLogServiceImpl, AgentFieldServiceImpl, and RagDocumentServiceImpl/
 * RagDocumentProcessingService (SYSTEM-PLAN SP37). Callers keep their own key/path naming
 * (namespace, sub-directories) and pass both a candidate S3 key and a candidate local path;
 * only one is actually used, chosen by {@code aws.s3.enabled}.
 */
public interface StoragePort {

    /** Stores content and returns the location to persist (the S3 key, or the local path). */
    String store(String s3Key, Path localPath, InputStream content, String contentType, long contentLength)
            throws IOException;

    byte[] readBytes(String storedLocation) throws IOException;

    /** Best-effort; failures are logged, not thrown -- matches prior per-caller behavior. */
    void delete(String storedLocation);

    /** Presigned GET URL when S3 is active; null in local mode (caller falls back to serving
     * the file directly). */
    String presignedUrl(String storedLocation, Duration ttl);

    boolean isS3Enabled();
}
