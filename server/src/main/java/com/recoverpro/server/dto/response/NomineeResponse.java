package com.recoverpro.server.dto.response;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NomineeResponse {
    private UUID borrowerId;
    private String nomineeName;
    private String nomineeRelation;
    private String nomineePhone;
    private String nomineeEmail;
    private Instant recordedAt;
}
