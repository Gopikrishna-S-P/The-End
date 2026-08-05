package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.PresignedUploadResponse;

import java.util.UUID;

public interface S3PresignService {

    /**
     * Returns a pre-signed S3 PUT URL valid for {@code expiryMinutes}.
     * The client uploads directly to S3; the app server never sees the bytes.
     *
     * @param orgId           tenant scoping — prefixed into the S3 key
     * @param originalFilename original filename for Content-Disposition
     * @param contentType     MIME type the client must use when PUT-ing
     * @return pre-signed URL + the S3 object key (stored on FileUpload entity)
     */
    PresignedUploadResponse generateUploadUrl(UUID orgId, String originalFilename, String contentType);
}
