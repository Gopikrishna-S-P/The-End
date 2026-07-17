package com.recoverpro.server.client;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LlamaEmbeddingRequest {

    private String model;
    private List<String> input;
}
