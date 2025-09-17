-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User usage tracking table (authenticated users)
CREATE TABLE IF NOT EXISTS user_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    generations_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Anonymous usage tracking table (by IP + fingerprint)
CREATE TABLE IF NOT EXISTS anonymous_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    anonymous_id TEXT NOT NULL, -- IP + fingerprint hash
    ip_address TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    generations_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(anonymous_id, date)
);

-- Generation logs for analytics and security auditing
CREATE TABLE IF NOT EXISTS generation_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    anonymous_id TEXT, -- For anonymous users (hashed)
    ip_address TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    limit_type TEXT CHECK (limit_type IN ('anonymous', 'authenticated')),
    generations_before INTEGER DEFAULT 0,
    generations_after INTEGER DEFAULT 0
);

-- Row Level Security (RLS) policies
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage data
CREATE POLICY "Users can view own usage" ON user_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all data (for Edge Functions)
CREATE POLICY "Service role full access user_usage" ON user_usage
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access anonymous_usage" ON anonymous_usage
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access generation_logs" ON generation_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Indexes for performance and security queries
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id_date ON user_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_anonymous_id_date ON anonymous_usage(anonymous_id, date);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_ip_date ON anonymous_usage(ip_address, date);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_ip_fingerprint ON anonymous_usage(ip_address, fingerprint);
CREATE INDEX IF NOT EXISTS idx_generation_logs_user_id ON generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_anonymous_id ON generation_logs(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_created_at ON generation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_generation_logs_ip_address ON generation_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_generation_logs_limit_type ON generation_logs(limit_type);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_user_usage_updated_at 
    BEFORE UPDATE ON user_usage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anonymous_usage_updated_at 
    BEFORE UPDATE ON anonymous_usage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Security function to clean old anonymous data (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_anonymous_data()
RETURNS void AS $
BEGIN
    -- Delete anonymous usage data older than 30 days
    DELETE FROM anonymous_usage 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Delete generation logs older than 90 days for anonymous users
    DELETE FROM generation_logs 
    WHERE user_id IS NULL 
    AND created_at < NOW() - INTERVAL '90 days';
END;
$ language 'plpgsql';