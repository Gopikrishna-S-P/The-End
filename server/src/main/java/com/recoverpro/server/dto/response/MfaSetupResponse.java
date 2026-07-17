package com.recoverpro.server.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MfaSetupResponse {
    private String secret;
    /** otpauth:// URI — render as QR code on the frontend */
    private String qrCodeUri;
    private String manualEntryKey;
}
