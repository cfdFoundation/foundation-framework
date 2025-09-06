-- Database setup for Chat 2 API Framework
-- Run this script to set up PostgreSQL database

-- Create database and user
CREATE DATABASE api_framework;
CREATE USER api_user WITH PASSWORD 'api_password';
GRANT ALL PRIVILEGES ON DATABASE api_framework TO api_user;

-- Connect to the database
\c api_framework;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO api_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO api_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO api_user;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Logging table (created automatically by logging service, but here for reference)
CREATE TABLE IF NOT EXISTS api_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    request_id VARCHAR(36),
    instance_id VARCHAR(8),
    module VARCHAR(100),
    method VARCHAR(100),
    user_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    response_time INTEGER,
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for logging table
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_level ON api_logs(level);
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON api_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_module ON api_logs(module);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);

-- Demo records table (created automatically by demo module, but here for reference)
CREATE TABLE IF NOT EXISTS demo_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INTEGER DEFAULT 1
);

-- Indexes for demo records
CREATE INDEX IF NOT EXISTS idx_demo_records_name ON demo_records(name);
CREATE INDEX IF NOT EXISTS idx_demo_records_category ON demo_records(category);
CREATE INDEX IF NOT EXISTS idx_demo_records_status ON demo_records(status);
CREATE INDEX IF NOT EXISTS idx_demo_records_created_by ON demo_records(created_by);
CREATE INDEX IF NOT EXISTS idx_demo_records_created_at ON demo_records(created_at DESC);

-- Full-text search index for demo records
CREATE INDEX IF NOT EXISTS idx_demo_records_search ON demo_records USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Sample data for testing
INSERT INTO demo_records (name, description, category, tags, created_by) VALUES
('Sample Record 1', 'This is a sample record for testing', 'sample', '["test", "demo"]', 'system'),
('Sample Record 2', 'Another sample record', 'sample', '["test", "example"]', 'system'),
('Public Demo', 'Public record for API testing', 'public', '["public", "api", "test"]', 'system'),
('Advanced Example', 'More complex record with metadata', 'advanced', '["complex", "metadata"]', 'system');

-- Update metadata for advanced example
UPDATE demo_records 
SET metadata = '{"complexity": "high", "features": ["search", "cache", "validation"]}'
WHERE name = 'Advanced Example';

-- Users table (optional - for more advanced auth)
CREATE TABLE IF NOT EXISTS api_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    roles JSONB DEFAULT '["user"]',
    permissions JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for users
CREATE INDEX IF NOT EXISTS idx_api_users_email ON api_users(email);
CREATE INDEX IF NOT EXISTS idx_api_users_status ON api_users(status);

-- Sample user (password is 'password123' hashed)
INSERT INTO api_users (email, password_hash, name, roles, permissions) VALUES
('demo@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKuN7S6Y.xJw2CW', 'Demo User', '["user", "admin"]', '["read", "write", "admin"]');

-- API keys table (optional - for API key authentication)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES api_users(id),
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    permissions JSONB DEFAULT '["read"]',
    rate_limit INTEGER DEFAULT 1000,
    expires_at TIMESTAMPTZ,
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- Grant permissions to api_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO api_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO api_user;

-- Create a function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Add triggers for automatic updated_at updates
CREATE TRIGGER update_demo_records_updated_at BEFORE UPDATE ON demo_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_users_updated_at BEFORE UPDATE ON api_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance tuning (adjust based on your system)
-- ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
-- ALTER SYSTEM SET log_statement = 'all';
-- ALTER SYSTEM SET log_duration = on;

COMMIT;