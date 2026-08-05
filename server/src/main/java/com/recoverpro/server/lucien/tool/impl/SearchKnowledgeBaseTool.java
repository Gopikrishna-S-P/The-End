package com.recoverpro.server.lucien.tool.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recoverpro.server.client.LlamaClient;
import com.recoverpro.server.lucien.tool.LucienTool;
import com.recoverpro.server.repository.RagDocumentChunkRepository;
import com.recoverpro.server.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Searches the platform compliance document library (RBI circulars, DLG
 * guidelines, company SOPs) uploaded via RagDocumentAdminController.
 * Global -- not organization-scoped, so unlike most tools this doesn't
 * enforce OrgIsolationGuard.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SearchKnowledgeBaseTool implements LucienTool {

    private static final int TOP_K = 5;

    private final LlamaClient llamaClient;
    private final RagDocumentChunkRepository chunkRepository;
    private final ObjectMapper objectMapper;

    @Override public String name() { return "search_knowledge_base"; }

    @Override
    public String description() {
        return "Search the compliance document library (RBI circulars, DLG guidelines, "
                + "company SOPs) for information relevant to a question. Requires query.";
    }

    @Override
    public String parametersSchema() {
        return """
                {"type":"object","properties":{
                  "query":{"type":"string","description":"What to search for, in plain language"}
                },"required":["query"]}""";
    }

    @Override public boolean isWriteOperation() { return false; }

    @Override
    public String humanReadableSummary(JsonNode args) {
        return "Search compliance documents for: " + args.path("query").asText();
    }

    @Override
    public String execute(JsonNode args, UserPrincipal principal) {
        try {
            String query = args.get("query").asText();
            List<List<Float>> embeddings = llamaClient.embed(List.of(query));
            if (embeddings.isEmpty()) {
                return "{\"error\": \"Could not embed search query\"}";
            }

            String queryVector = toVectorLiteral(embeddings.get(0));
            List<RagDocumentChunkRepository.ChunkSearchResult> results =
                    chunkRepository.searchTopK(queryVector, TOP_K);

            if (results.isEmpty()) {
                return "{\"results\": [], \"message\": \"No relevant documents found\"}";
            }

            List<Map<String, String>> payload = results.stream()
                    .map(r -> Map.of(
                            "documentTitle", r.getDocumentTitle(),
                            "content", r.getContent()))
                    .toList();

            return objectMapper.writeValueAsString(Map.of("results", payload));
        } catch (Exception e) {
            log.error("SearchKnowledgeBaseTool failed: {}", e.getMessage());
            return "{\"error\": \"Could not search knowledge base: " + e.getMessage() + "\"}";
        }
    }

    private static String toVectorLiteral(List<Float> embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(embedding.get(i));
        }
        return sb.append(']').toString();
    }
}
