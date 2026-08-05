package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TeamSection {
    private long totalUsers;
    private long activeUsers;
    private List<RoleCount> usersByRole;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RoleCount {
        private String roleName;
        private long count;
    }
}
