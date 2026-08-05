package com.recoverpro.server.dto.response;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallStartResponse {

    private UUID callLogId;
    private String phoneNumber;
}
