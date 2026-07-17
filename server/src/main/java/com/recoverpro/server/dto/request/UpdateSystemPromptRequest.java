package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSystemPromptRequest {

    @NotBlank
    @Size(min = 50, max = 10000)
    private String promptTemplate;

    @Size(max = 500)
    private String description;
}
