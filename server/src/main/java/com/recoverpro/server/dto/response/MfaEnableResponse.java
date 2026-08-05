package com.recoverpro.server.dto.response;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MfaEnableResponse {
    /** One-time plain-text recovery codes — shown once at MFA setup, never again */
    private List<String> recoveryCodes;
}
