-- V026__agent_location_pings_session_fk.sql
-- Makes shift_id nullable (visit pings have no shift) and adds visit_session_id FK.

ALTER TABLE agent_location_pings
    ALTER COLUMN shift_id DROP NOT NULL;

ALTER TABLE agent_location_pings
    ADD COLUMN visit_session_id UUID REFERENCES visit_sessions(id);

CREATE INDEX idx_ping_visit_session ON agent_location_pings (visit_session_id);
