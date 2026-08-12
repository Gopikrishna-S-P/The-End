package com.recoverpro.server.lucien.ambient;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AmbientReplyParserTest {

    private AmbientReplyParser parser;

    @BeforeEach
    void setUp() {
        parser = new AmbientReplyParser(new ObjectMapper());
    }

    @Test
    void parse_cleanSpeakTrue_returnsSpeakWithText() {
        var reply = parser.parse("{\"speak\": true, \"text\": \"Ask when he can pay.\"}");
        assertThat(reply.speak()).isTrue();
        assertThat(reply.text()).isEqualTo("Ask when he can pay.");
    }

    @Test
    void parse_cleanSpeakFalse_returnsSilent() {
        var reply = parser.parse("{\"speak\": false, \"text\": null}");
        assertThat(reply.speak()).isFalse();
        assertThat(reply.text()).isNull();
    }

    @Test
    void parse_jsonWrappedInMarkdownFence_stillExtracted() {
        var reply = parser.parse("```json\n{\"speak\": true, \"text\": \"Offer a 10% discount.\"}\n```");
        assertThat(reply.speak()).isTrue();
        assertThat(reply.text()).isEqualTo("Offer a 10% discount.");
    }

    @Test
    void parse_malformedJson_returnsSilentNotException() {
        var reply = parser.parse("Sure, here's my thought: {speak: true, text unquoted}");
        assertThat(reply.speak()).isFalse();
        assertThat(reply.text()).isNull();
    }

    @Test
    void parse_speakTrueWithBlankText_returnsSilent() {
        var reply = parser.parse("{\"speak\": true, \"text\": \"\"}");
        assertThat(reply.speak()).isFalse();
    }

    @Test
    void parse_emptyContent_returnsSilent() {
        var reply = parser.parse("");
        assertThat(reply.speak()).isFalse();
    }
}
