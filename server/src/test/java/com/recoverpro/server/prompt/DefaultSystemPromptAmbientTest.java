package com.recoverpro.server.prompt;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DefaultSystemPromptAmbientTest {

    @Test
    void ambientTemplate_declaresTheSpeakSilentJsonContract() {
        assertThat(DefaultSystemPrompt.AMBIENT_TEMPLATE)
                .contains("\"speak\"")
                .contains("\"text\"")
                .doesNotContain("<tool_call>");
    }

    @Test
    void forceSpeakInstruction_mentionsHelpButton() {
        assertThat(DefaultSystemPrompt.AMBIENT_FORCE_SPEAK_INSTRUCTION)
                .containsIgnoringCase("help");
    }
}
