-- =============================================================================
-- V083__lucien_ambient_mode.sql
-- =============================================================================
-- Adds the interaction mode for a Lucien chat session: CHAT (default, turn-based
-- text/voice) or AMBIENT (continuous doorstep listening). See ChatSession.java.
-- =============================================================================

ALTER TABLE lucien_chat_sessions
    ADD COLUMN interaction_mode VARCHAR(20) NOT NULL DEFAULT 'CHAT';
