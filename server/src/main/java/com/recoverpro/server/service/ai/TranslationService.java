package com.recoverpro.server.service.ai;

import com.recoverpro.server.client.LlamaClient;
import com.recoverpro.server.client.LlamaMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * TEMPORARY: translates Lucien's (English) reply text into the target Indic
 * language before it's sent to tts-service, so the voice reply speaks actual
 * Kannada/Hindi/Tamil/Telugu words instead of English words in an Indic
 * accent. Reuses the same local Ollama model LucienService already calls for
 * chat — adds one more slow CPU-bound call on top of an already-slow local
 * TTS pipeline. Only makes sense while this whole voice feature is a
 * proof-of-concept; revert alongside the rest of it once the infra question
 * (GPU / hosted API) is settled.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TranslationService {

    private static final Map<String, String> LANGUAGE_NAMES = Map.of(
            "hi", "Hindi",
            "ta", "Tamil",
            "kn", "Kannada",
            "te", "Telugu"
    );

    private final LlamaClient llamaClient;

    /** Returns the translated text, or the original text if translation fails or lang is unrecognized. */
    public String translateForSpeech(String text, String lang) {
        String languageName = LANGUAGE_NAMES.get(lang.toLowerCase());
        if (languageName == null) {
            return text;
        }

        try {
            List<LlamaMessage> messages = List.of(
                    LlamaMessage.builder()
                            .role("system")
                            .content("You are a translation engine. Translate the user's message into " + languageName
                                    + " using " + languageName + " script. Output ONLY the translated text — "
                                    + "no explanations, no quotes, no transliteration.")
                            .build(),
                    LlamaMessage.builder().role("user").content(text).build()
            );
            String translated = llamaClient.extractReply(llamaClient.chat(messages)).trim();
            log.info("Translated {} chars to {} ({} chars)", text.length(), languageName, translated.length());
            return translated;
        } catch (Exception ex) {
            log.warn("Translation to {} failed, speaking original text instead: {}", languageName, ex.getMessage());
            return text;
        }
    }
}
