package com.recoverpro.server.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LlamaRequest {

    private String model;
    private List<LlamaMessage> messages;

    @JsonProperty("max_tokens")
    private int maxTokens;

    private double temperature;

    @JsonProperty("top_p")
    private double topP;

    @JsonProperty("stop")
    private List<String> stopSequences;

    private boolean stream;
}