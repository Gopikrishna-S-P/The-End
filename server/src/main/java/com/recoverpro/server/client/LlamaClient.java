package com.recoverpro.server.client;

import com.recoverpro.server.exception.LlamaUnavailableException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class LlamaClient {

    private final RestTemplate llamaRestTemplate;
    private final ObjectMapper objectMapper;

    @Value("${lucien.llama.base-url}")
    private String baseUrl;

    @Value("${lucien.llama.model}")
    private String model;

    @Value("${lucien.llama.max-tokens:1024}")
    private int maxTokens;

    @Value("${lucien.llama.temperature:0.7}")
    private double temperature;

    @Value("${lucien.llama.top-p:0.9}")
    private double topP;

    @Value("${lucien.llama.embedding-model:nomic-embed-text}")
    private String embeddingModel;

    @CircuitBreaker(name = "llama", fallbackMethod = "chatFallback")
    public LlamaResponse chat(List<LlamaMessage> messages) {
        LlamaRequest request = LlamaRequest.builder()
                .model(model)
                .messages(messages)
                .maxTokens(maxTokens)
                .temperature(temperature)
                .topP(topP)
                .stream(false)
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<LlamaRequest> entity = new HttpEntity<>(request, headers);

        log.debug("Sending {} messages to Llama at {}", messages.size(), baseUrl);
        long start = System.currentTimeMillis();

        try {
            ResponseEntity<LlamaResponse> response = llamaRestTemplate.postForEntity(
                    baseUrl + "/v1/chat/completions",
                    entity,
                    LlamaResponse.class
            );

            long latency = System.currentTimeMillis() - start;
            log.info("Llama responded in {}ms, choices={}", latency,
                    response.getBody() != null && response.getBody().getChoices() != null
                            ? response.getBody().getChoices().size() : 0);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }

            throw new LlamaUnavailableException("Llama returned non-2xx status: " + response.getStatusCode());

        } catch (ResourceAccessException ex) {
            log.error("Llama server is unreachable at {}: {}", baseUrl, ex.getMessage());
            throw new LlamaUnavailableException("FRIDAY AI is temporarily unavailable. Please try again shortly.");
        } catch (LlamaUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error communicating with Llama: {}", ex.getMessage(), ex);
            throw new LlamaUnavailableException("Unexpected error communicating with AI service.");
        }
    }

    public LlamaResponse chatFallback(List<LlamaMessage> messages, Exception ex) {
        log.warn("Llama circuit breaker open — returning fast failure. Cause: {}", ex.getMessage());
        throw new LlamaUnavailableException(
                "FRIDAY AI is temporarily unavailable (circuit open). Please try again shortly.");
    }

    /** Embeds a batch of texts. Returns one float vector per input, same order. */
    @CircuitBreaker(name = "llama", fallbackMethod = "embedFallback")
    public List<List<Float>> embed(List<String> texts) {
        LlamaEmbeddingRequest request = LlamaEmbeddingRequest.builder()
                .model(embeddingModel)
                .input(texts)
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<LlamaEmbeddingRequest> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<LlamaEmbeddingResponse> response = llamaRestTemplate.postForEntity(
                    baseUrl + "/v1/embeddings", entity, LlamaEmbeddingResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null
                    && response.getBody().getData() != null) {
                return response.getBody().getData().stream()
                        .sorted((a, b) -> Integer.compare(a.getIndex(), b.getIndex()))
                        .map(LlamaEmbeddingResponse.EmbeddingData::getEmbedding)
                        .toList();
            }
            throw new LlamaUnavailableException("Llama embeddings returned non-2xx status: " + response.getStatusCode());

        } catch (ResourceAccessException ex) {
            log.error("Llama embeddings server unreachable at {}: {}", baseUrl, ex.getMessage());
            throw new LlamaUnavailableException("Embedding service is temporarily unavailable. Please try again shortly.");
        } catch (LlamaUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error calling Llama embeddings: {}", ex.getMessage(), ex);
            throw new LlamaUnavailableException("Unexpected error communicating with the embedding service.");
        }
    }

    public List<List<Float>> embedFallback(List<String> texts, Exception ex) {
        log.warn("Llama embeddings circuit breaker open — returning fast failure. Cause: {}", ex.getMessage());
        throw new LlamaUnavailableException("Embedding service is temporarily unavailable (circuit open).");
    }

    public String extractReply(LlamaResponse response) {
        if (response == null
                || response.getChoices() == null
                || response.getChoices().isEmpty()
                || response.getChoices().get(0).getMessage() == null) {
            throw new LlamaUnavailableException("Llama returned an empty response.");
        }
        return response.getChoices().get(0).getMessage().getContent();
    }
}