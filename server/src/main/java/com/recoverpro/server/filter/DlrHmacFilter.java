package com.recoverpro.server.filter;

import com.recoverpro.server.config.DlrProvidersProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StreamUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DlrHmacFilter extends OncePerRequestFilter {

    private static final String PATH_PATTERN = "/api/v1/cadence/dlr/**";
    private final AntPathMatcher pathMatcher = new AntPathMatcher();
    private final DlrProvidersProperties config;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !pathMatcher.match(PATH_PATTERN, request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String provider = extractProvider(request.getRequestURI());
        if (provider == null) {
            reject(response, "missing provider in path");
            return;
        }

        DlrProvidersProperties.ProviderConfig pc = config.getProviders().get(provider);
        if (pc == null || pc.getSecret() == null || pc.getSecret().isBlank()) {
            if (config.isStrict()) {
                log.warn("DLR rejected: unknown provider '{}'", provider);
                reject(response, "unknown provider");
                return;
            }
            chain.doFilter(request, response);
            return;
        }

        ContentCachingRequestWrapper wrapped = new ContentCachingRequestWrapper(request);
        byte[] body;
        try {
            body = StreamUtils.copyToByteArray(wrapped.getInputStream());
        } catch (IOException e) {
            reject(response, "could not read body");
            return;
        }

        String headerName = pc.getSignatureHeader() != null ? pc.getSignatureHeader() : "X-Provider-Signature";
        String received = request.getHeader(headerName);
        if (received == null || received.isBlank()) {
            log.warn("DLR rejected: missing {} header (provider={})", headerName, provider);
            reject(response, "missing signature");
            return;
        }

        // Strip optional "sha256="/"sha1=" prefix
        int eq = received.indexOf('=');
        if (eq > 0 && eq < received.length() - 1
                && received.substring(0, eq).toLowerCase().startsWith("sha")) {
            received = received.substring(eq + 1);
        }

        String algo     = normaliseAlgo(pc.getAlgorithm());
        String encoding = pc.getEncoding() != null ? pc.getEncoding().toLowerCase() : "hex";
        byte[] payload  = pc.isTwilioStyleCanonicalize()
                ? twilioCanonicalString(wrapped).getBytes(StandardCharsets.UTF_8)
                : body;

        String expected;
        try {
            expected = hmacEncoded(algo, encoding, pc.getSecret(), payload);
        } catch (Exception e) {
            log.error("DLR HMAC compute failed: provider={} algo={} error={}", provider, algo, e.getMessage());
            reject(response, "signature compute error");
            return;
        }

        boolean valid = "hex".equals(encoding)
                ? constantTimeEquals(received.toLowerCase(), expected.toLowerCase())
                : constantTimeEquals(received, expected);

        if (!valid) {
            log.warn("DLR rejected: bad signature (provider={} algo={} encoding={})", provider, algo, encoding);
            reject(response, "bad signature");
            return;
        }

        chain.doFilter(wrapped, response);
    }

    private String twilioCanonicalString(HttpServletRequest req) {
        StringBuilder sb = new StringBuilder();
        StringBuffer url = req.getRequestURL();
        if (req.getQueryString() != null) url.append('?').append(req.getQueryString());
        sb.append(url);
        Map<String, String[]> params = req.getParameterMap();
        List<String> keys = new ArrayList<>(params.keySet());
        Collections.sort(keys);
        for (String k : keys) {
            for (String v : params.get(k)) sb.append(k).append(v == null ? "" : v);
        }
        return sb.toString();
    }

    private String extractProvider(String uri) {
        int idx = uri.indexOf("/cadence/dlr/");
        if (idx < 0) return null;
        String tail = uri.substring(idx + "/cadence/dlr/".length());
        int slash = tail.indexOf('/');
        String prov = slash < 0 ? tail : tail.substring(0, slash);
        return prov.isBlank() ? null : prov;
    }

    private static String normaliseAlgo(String algo) {
        if (algo == null) return "HmacSHA256";
        return switch (algo.trim().toUpperCase()) {
            case "SHA1",   "SHA-1",   "HMACSHA1"   -> "HmacSHA1";
            case "SHA512", "SHA-512", "HMACSHA512" -> "HmacSHA512";
            default                                -> "HmacSHA256";
        };
    }

    private static String hmacEncoded(String macAlgo, String encoding, String secret, byte[] payload)
            throws Exception {
        Mac mac = Mac.getInstance(macAlgo);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), macAlgo));
        byte[] digest = mac.doFinal(payload);
        if ("base64".equals(encoding)) return Base64.getEncoder().encodeToString(digest);
        StringBuilder sb = new StringBuilder(digest.length * 2);
        for (byte b : digest) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }

    private static void reject(HttpServletResponse response, String reason) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"success\":false,\"message\":\"Webhook rejected\"}");
    }
}
