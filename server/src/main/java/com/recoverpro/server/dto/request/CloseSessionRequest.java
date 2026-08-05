package com.recoverpro.server.dto.request;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CloseSessionRequest {

    private UUID visitLogId;
}
