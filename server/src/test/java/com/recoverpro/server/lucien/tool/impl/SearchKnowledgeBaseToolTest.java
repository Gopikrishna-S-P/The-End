package com.recoverpro.server.lucien.tool.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recoverpro.server.client.LlamaClient;
import com.recoverpro.server.repository.RagDocumentChunkRepository;
import com.recoverpro.server.repository.RagDocumentChunkRepository.ChunkSearchResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchKnowledgeBaseToolTest {

    @Mock private LlamaClient llamaClient;
    @Mock private RagDocumentChunkRepository chunkRepository;

    private SearchKnowledgeBaseTool tool;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        tool = new SearchKnowledgeBaseTool(llamaClient, chunkRepository, objectMapper);
    }

    private JsonNode argsWithQuery(String query) throws Exception {
        return objectMapper.readTree("{\"query\": \"" + query + "\"}");
    }

    @Test
    void name_isStableToolId() {
        assertThat(tool.name()).isEqualTo("search_knowledge_base");
        assertThat(tool.isWriteOperation()).isFalse();
    }

    @Test
    void execute_returnsTopResultsAsJson() throws Exception {
        when(llamaClient.embed(List.of("cash handling limit"))).thenReturn(List.of(List.of(0.1f, 0.2f)));

        ChunkSearchResult result = mockResult("Cash must be deposited within 24 hours.", "Cash Handling SOP");
        when(chunkRepository.searchTopK(eq("[0.1,0.2]"), eq(5))).thenReturn(List.of(result));

        String output = tool.execute(argsWithQuery("cash handling limit"), null);

        JsonNode parsed = objectMapper.readTree(output);
        assertThat(parsed.get("results")).hasSize(1);
        assertThat(parsed.get("results").get(0).get("documentTitle").asText()).isEqualTo("Cash Handling SOP");
        assertThat(parsed.get("results").get(0).get("content").asText())
                .isEqualTo("Cash must be deposited within 24 hours.");
    }

    @Test
    void execute_noResults_returnsEmptyResultsMessage() throws Exception {
        when(llamaClient.embed(any())).thenReturn(List.of(List.of(0.5f)));
        when(chunkRepository.searchTopK(any(), eq(5))).thenReturn(List.of());

        String output = tool.execute(argsWithQuery("nonexistent topic"), null);

        JsonNode parsed = objectMapper.readTree(output);
        assertThat(parsed.get("results")).isEmpty();
    }

    @Test
    void execute_embeddingServiceThrows_returnsJsonErrorNotException() throws Exception {
        when(llamaClient.embed(any())).thenThrow(new RuntimeException("Ollama unreachable"));

        String output = tool.execute(argsWithQuery("anything"), null);

        JsonNode parsed = objectMapper.readTree(output);
        assertThat(parsed.has("error")).isTrue();
        assertThat(parsed.get("error").asText()).contains("Ollama unreachable");
    }

    private static ChunkSearchResult mockResult(String content, String title) {
        return new ChunkSearchResult() {
            @Override public String getContent() { return content; }
            @Override public String getDocumentTitle() { return title; }
            @Override public UUID getDocumentId() { return UUID.randomUUID(); }
        };
    }
}
