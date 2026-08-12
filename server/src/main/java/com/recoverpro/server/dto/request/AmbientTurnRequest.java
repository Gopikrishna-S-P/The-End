package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AmbientTurnRequest {

    /** The transcribed utterance for this turn — one VAD-segmented chunk from the frontend's
     * continuous mic capture, already run through SttClient. */
    @NotBlank
    private String text;

    /** Optional — "fo" or "customer" if the frontend can tell them apart, null otherwise.
     * Lucien is prompted to infer speaker structure without this if it's absent. */
    private String speakerHint;
}
