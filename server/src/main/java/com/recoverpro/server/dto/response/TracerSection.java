package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TracerSection {

    private long casesAssignedToday;
    private long casesTracedToday;
    private long pendingTraces;
    private long contactsLocatedToday;
}
