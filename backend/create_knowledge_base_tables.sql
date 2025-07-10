-- Create knowledge base tables for document storage and semantic search

-- Knowledge documents table
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE NOT NULL,
    tags TEXT, -- JSON array of tags
    summary TEXT,
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge chunks table for embeddings
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding TEXT NOT NULL, -- JSON array of embedding vector
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_at ON knowledge_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_title ON knowledge_documents(title);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_chunk_index ON knowledge_chunks(chunk_index);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_knowledge_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_documents_updated_at_trigger
    BEFORE UPDATE ON knowledge_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_documents_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own documents
CREATE POLICY knowledge_documents_user_policy ON knowledge_documents
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Users can only see chunks from their own documents
CREATE POLICY knowledge_chunks_user_policy ON knowledge_chunks
    FOR ALL TO authenticated
    USING (
        document_id IN (
            SELECT id FROM knowledge_documents WHERE user_id = auth.uid()
        )
    );

-- Knowledge base statistics view
CREATE OR REPLACE VIEW knowledge_base_stats AS
SELECT 
    user_id,
    COUNT(*) as total_documents,
    SUM(file_size) as total_size_bytes,
    SUM(chunk_count) as total_chunks,
    AVG(chunk_count) as avg_chunks_per_doc,
    MAX(created_at) as last_upload_date,
    COUNT(DISTINCT file_type) as unique_file_types
FROM knowledge_documents
GROUP BY user_id;