package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeakRequest {

    @NotBlank
    @Size(min = 1, max = 2000)
    private String text;

    /** One of TtsClient.SUPPORTED_LANGS — hi, ta, kn, te. */
    @NotBlank
    @Pattern(regexp = "hi|ta|kn|te", message = "lang must be one of: hi, ta, kn, te")
    private String lang;
}
