package com.recoverpro.server.entity;

import com.recoverpro.server.enums.ChatRole;
import com.recoverpro.server.enums.SafetyDecision;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lucien_chat_messages", indexes = {
        @Index(name = "idx_msg_session_id", columnList = "session_id"),
        @Index(name = "idx_msg_agent_id",   columnList = "agent_id"),
        @Index(name = "idx_msg_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private ChatRole role;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "input_safety_decision", length = 30)
    private SafetyDecision inputSafetyDecision;

    @Enumerated(EnumType.STRING)
    @Column(name = "output_safety_decision", length = 30)
    private SafetyDecision outputSafetyDecision;

    @Column(name = "input_tokens")
    private Integer inputTokens;

    @Column(name = "output_tokens")
    private Integer outputTokens;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(name = "model_name", length = 100)
    private String modelName;

    @Column(name = "was_blocked", nullable = false)
    @Builder.Default
    private Boolean wasBlocked = false;

    @Column(name = "block_reason", length = 500)
    private String blockReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
