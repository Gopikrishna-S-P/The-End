package com.recoverpro.server.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RagDocumentChunkerTest {

    @Test
    void chunk_shortText_returnsSingleChunk() {
        List<String> chunks = RagDocumentChunker.chunk("A short compliance note.", 1000, 150);
        assertThat(chunks).containsExactly("A short compliance note.");
    }

    @Test
    void chunk_nullText_returnsEmptyList() {
        assertThat(RagDocumentChunker.chunk(null, 1000, 150)).isEmpty();
    }

    @Test
    void chunk_blankText_returnsEmptyList() {
        assertThat(RagDocumentChunker.chunk("   \n\t  ", 1000, 150)).isEmpty();
    }

    @Test
    void chunk_longText_splitsIntoMultiplePieces() {
        String text = "word ".repeat(500); // 2500 chars
        List<String> chunks = RagDocumentChunker.chunk(text, 1000, 150);

        assertThat(chunks.size()).isGreaterThan(1);
        chunks.forEach(c -> assertThat(c.length()).isLessThanOrEqualTo(1000));
    }

    @Test
    void chunk_longText_consecutiveChunksOverlap() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 400; i++) sb.append("token").append(i).append(' ');
        String text = sb.toString();

        List<String> chunks = RagDocumentChunker.chunk(text, 1000, 150);

        assertThat(chunks).hasSizeGreaterThan(1);
        String firstChunkTail = chunks.get(0).substring(Math.max(0, chunks.get(0).length() - 20));
        assertThat(chunks.get(1)).contains(firstChunkTail.trim().split(" ")[0]);
    }

    @Test
    void chunk_exactlyChunkSize_returnsSingleChunk() {
        String text = "a".repeat(1000);
        List<String> chunks = RagDocumentChunker.chunk(text, 1000, 150);
        assertThat(chunks).hasSize(1);
    }

    @Test
    void chunk_defaultOverload_usesDefaultSizes() {
        String text = "word ".repeat(500);
        List<String> chunks = RagDocumentChunker.chunk(text);
        assertThat(chunks).isNotEmpty();
        chunks.forEach(c -> assertThat(c.length()).isLessThanOrEqualTo(RagDocumentChunker.DEFAULT_CHUNK_SIZE));
    }
}
