package com.recoverpro.server.service.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.ByteArrayInputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class S3OrLocalStoragePortTest {

    @Mock private S3Client s3Client;
    @Mock private S3Presigner s3Presigner;

    private S3OrLocalStoragePort port;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        port = new S3OrLocalStoragePort();
        ReflectionTestUtils.setField(port, "s3Client", s3Client);
        ReflectionTestUtils.setField(port, "s3Presigner", s3Presigner);
    }

    @Test
    void localMode_storeThenReadThenDelete_roundTripsThroughDisk() throws Exception {
        ReflectionTestUtils.setField(port, "s3Enabled", false);
        Path target = tempDir.resolve("sub/file.txt");
        byte[] data = "hello".getBytes();

        String location = port.store("ignored/key", target, new ByteArrayInputStream(data), "text/plain", data.length);

        assertThat(location).isEqualTo(target.toString());
        assertThat(Files.readAllBytes(target)).isEqualTo(data);
        assertThat(port.readBytes(location)).isEqualTo(data);
        assertThat(port.presignedUrl(location, Duration.ofHours(1))).isNull();

        port.delete(location);
        assertThat(Files.exists(target)).isFalse();
    }

    @Test
    void s3Mode_store_putsToBucketAndReturnsKey() throws Exception {
        ReflectionTestUtils.setField(port, "s3Enabled", true);
        ReflectionTestUtils.setField(port, "s3Bucket", "my-bucket");
        byte[] data = "hello".getBytes();

        String location = port.store("docs/file.txt", tempDir.resolve("unused.txt"),
                new ByteArrayInputStream(data), "text/plain", data.length);

        assertThat(location).isEqualTo("docs/file.txt");
        verify(s3Client).putObject(any(software.amazon.awssdk.services.s3.model.PutObjectRequest.class),
                any(software.amazon.awssdk.core.sync.RequestBody.class));
    }

    @Test
    void s3Mode_readBytes_getsFromBucket() throws Exception {
        ReflectionTestUtils.setField(port, "s3Enabled", true);
        ReflectionTestUtils.setField(port, "s3Bucket", "my-bucket");
        byte[] data = "world".getBytes();
        ResponseBytes<GetObjectResponse> responseBytes =
                ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), data);
        when(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).thenReturn(responseBytes);

        byte[] result = port.readBytes("docs/file.txt");

        assertThat(result).isEqualTo(data);
    }

    @Test
    void s3Mode_presignedUrl_returnsUrlFromPresigner() throws Exception {
        ReflectionTestUtils.setField(port, "s3Enabled", true);
        ReflectionTestUtils.setField(port, "s3Bucket", "my-bucket");
        PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
        when(presigned.url()).thenReturn(new URL("https://example.com/signed"));
        when(s3Presigner.presignGetObject(any(software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest.class)))
                .thenReturn(presigned);

        String url = port.presignedUrl("docs/file.txt", Duration.ofHours(2));

        assertThat(url).isEqualTo("https://example.com/signed");
    }
}
