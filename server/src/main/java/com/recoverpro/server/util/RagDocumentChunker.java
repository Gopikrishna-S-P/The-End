package com.recoverpro.server.util;

import java.util.ArrayList;
import java.util.List;

/** Fixed-size character chunking with overlap, breaking on whitespace near the boundary. */
public final class RagDocumentChunker {

    public static final int DEFAULT_CHUNK_SIZE = 1000;
    public static final int DEFAULT_OVERLAP = 150;

    private RagDocumentChunker() {}

    public static List<String> chunk(String text) {
        return chunk(text, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP);
    }

    public static List<String> chunk(String text, int chunkSize, int overlap) {
        List<String> chunks = new ArrayList<>();
        if (text == null) return chunks;

        String normalized = text.strip();
        if (normalized.isEmpty()) return chunks;

        if (normalized.length() <= chunkSize) {
            chunks.add(normalized);
            return chunks;
        }

        int start = 0;
        while (start < normalized.length()) {
            int end = Math.min(start + chunkSize, normalized.length());
            if (end < normalized.length()) {
                int lastSpace = normalized.lastIndexOf(' ', end);
                if (lastSpace > start) {
                    end = lastSpace;
                }
            }

            String piece = normalized.substring(start, end).strip();
            if (!piece.isEmpty()) {
                chunks.add(piece);
            }

            if (end >= normalized.length()) break;
            start = Math.max(end - overlap, start + 1);
        }

        return chunks;
    }
}
