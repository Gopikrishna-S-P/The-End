package com.recoverpro.server.client;

import com.recoverpro.server.exception.TtsUnavailableException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Set;

/**
 * Client for the local tts-service (FastAPI, wraps AI4Bharat's IndicF5) — same
 * always-on-local-process pattern as {@link LlamaClient} talking to Ollama.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TtsClient {

    public static final Set<String> SUPPORTED_LANGS = Set.of("hi", "ta", "kn", "te");

    private final RestTemplate ttsRestTemplate;

    @Value("${lucien.tts.base-url}")
    private String baseUrl;

    @CircuitBreaker(name = "tts", fallbackMethod = "synthesizeFallback")
    public byte[] synthesize(String text, String lang) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<TtsRequest> entity = new HttpEntity<>(new TtsRequest(text, lang), headers);

        try {
            ResponseEntity<byte[]> response = ttsRestTemplate.postForEntity(
                    baseUrl + "/tts", entity, byte[].class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            throw new TtsUnavailableException("TTS service returned non-2xx status: " + response.getStatusCode());

        } catch (ResourceAccessException ex) {
            log.error("TTS service is unreachable at {}: {}", baseUrl, ex.getMessage());
            throw new TtsUnavailableException("Voice reply is temporarily unavailable.");
        } catch (TtsUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error communicating with TTS service: {}", ex.getMessage(), ex);
            throw new TtsUnavailableException("Unexpected error generating voice reply.");
        }
    }

    public byte[] synthesizeFallback(String text, String lang, Exception ex) {
        log.warn("TTS circuit breaker open — returning fast failure. Cause: {}", ex.getMessage());
        throw new TtsUnavailableException("Voice reply is temporarily unavailable (circuit open).");
    }

    private record TtsRequest(String text, String lang) {}
}
