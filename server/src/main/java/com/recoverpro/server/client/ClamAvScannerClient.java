package com.recoverpro.server.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.DataOutputStream;
import java.io.InputStream;
import java.net.Socket;

/**
 * Minimal ClamAV INSTREAM client for document virus scanning.
 * Returns true if the stream is clean (no virus detected).
 */
@Slf4j
@Component
public class ClamAvScannerClient {

    @Value("${clamav.host:localhost}")
    private String host;

    @Value("${clamav.port:3310}")
    private int port;

    @Value("${clamav.timeout-ms:10000}")
    private int timeoutMs;

    @Value("${clamav.enabled:false}")
    private boolean enabled;

    public boolean isClean(InputStream inputStream) {
        if (!enabled) {
            log.debug("ClamAV scanning disabled — treating file as clean");
            return true;
        }
        try (Socket socket = new Socket(host, port)) {
            socket.setSoTimeout(timeoutMs);
            DataOutputStream out = new DataOutputStream(socket.getOutputStream());
            out.write("zINSTREAM\0".getBytes());

            byte[] buf = new byte[8192];
            int read;
            while ((read = inputStream.read(buf)) > 0) {
                // ClamAV INSTREAM: each chunk prefixed with 4-byte big-endian length
                out.writeInt(read);
                out.write(buf, 0, read);
            }
            out.writeInt(0); // end-of-stream
            out.flush();

            byte[] response = socket.getInputStream().readAllBytes();
            String result = new String(response).trim();
            log.debug("ClamAV result: {}", result);
            return result.endsWith("OK");
        } catch (Exception e) {
            log.error("ClamAV scan failed — treating as infected: {}", e.getMessage());
            return false;
        }
    }
}
