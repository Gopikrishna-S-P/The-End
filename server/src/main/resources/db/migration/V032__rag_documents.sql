-- V032__rag_documents.sql
-- Platform-wide compliance document library, searchable by Lucien via
-- SearchKnowledgeBaseTool. Global (no organization_id) -- no RLS needed.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE rag_documents (
    id                      UUID         NOT NULL DEFAULT gen_random_uuid(),
    title                   VARCHAR(255) NOT NULL,
    description             VARCHAR(1000),
    content_type            VARCHAR(100) NOT NULL,
    file_path               VARCHAR(500) NOT NULL,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    error_message           TEXT,
    uploaded_by_user_id     UUID         NOT NULL REFERENCES users (id),
    supersedes_document_id  UUID         REFERENCES rag_documents (id),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX idx_rag_documents_status ON rag_documents (status);

CREATE TABLE rag_document_chunks (
    id           UUID          NOT NULL DEFAULT gen_random_uuid(),
    document_id  UUID          NOT NULL REFERENCES rag_documents (id),
    chunk_index  INTEGER       NOT NULL,
    content      TEXT          NOT NULL,
    embedding    vector(768),
    token_count  INTEGER,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX idx_rag_chunks_document ON rag_document_chunks (document_id);
CREATE INDEX idx_rag_chunks_embedding ON rag_document_chunks
    USING ivfflat (embedding vector_cosine_ops);
