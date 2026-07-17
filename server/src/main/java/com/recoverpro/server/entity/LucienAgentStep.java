package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Audit record for one ReAct step — persisted to lucien_agent_steps. */
@Entity
@Table(name = "lucien_agent_steps", indexes = {
        @Index(name = "idx_las_session", columnList = "session_id"),
        @Index(name = "idx_las_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LucienAgentStep {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false, length = 36)
    private String sessionId;

    @Column(name = "iteration", nullable = false)
    private int iteration;

    @Column(name = "thought", columnDefinition = "TEXT")
    private String thought;

    @Column(name = "tool_name", length = 100)
    private String toolName;

    @Column(name = "tool_input", columnDefinition = "TEXT")
    private String toolInput;

    @Column(name = "tool_output", columnDefinition = "TEXT")
    private String toolOutput;

    @Column(name = "is_write_tool", nullable = false)
    private boolean isWriteTool;

    @Column(name = "was_confirmed", nullable = false)
    private boolean wasConfirmed;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;
}
