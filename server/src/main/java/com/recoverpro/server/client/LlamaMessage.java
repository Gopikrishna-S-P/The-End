package com.recoverpro.server.client;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LlamaMessage {

    private String role;
    private String content;
}