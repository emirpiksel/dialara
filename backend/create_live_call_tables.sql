-- Create live call control tables for real-time monitoring and supervision

-- Live calls tracking table
CREATE TABLE IF NOT EXISTS live_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    caller_number VARCHAR(50),
    call_type VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    end_reason VARCHAR(100),
    agent_name VARCHAR(255),
    customer_name VARCHAR(255),
    duration_seconds INTEGER DEFAULT 0,
    final_transcript TEXT,
    supervisor_notes TEXT,
    intervention_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Live transcript events table
CREATE TABLE IF NOT EXISTS live_transcript_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) NOT NULL,
    speaker VARCHAR(50) NOT NULL, -- 'ai', 'customer', 'supervisor'
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    is_final BOOLEAN DEFAULT true,
    sentiment VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supervisor sessions table
CREATE TABLE IF NOT EXISTS supervisor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_id VARCHAR(255) NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supervisor_id, call_id)
);

-- Call interventions table
CREATE TABLE IF NOT EXISTS call_interventions (
    id VARCHAR(255) PRIMARY KEY,
    call_id VARCHAR(255) NOT NULL,
    supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intervention_type VARCHAR(100) NOT NULL,
    message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    success BOOLEAN NOT NULL,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call quality metrics table
CREATE TABLE IF NOT EXISTS call_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) NOT NULL,
    metric_type VARCHAR(100) NOT NULL, -- 'sentiment_change', 'silence_duration', 'interruption_count', etc.
    metric_value FLOAT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_calls_status ON live_calls(status);
CREATE INDEX IF NOT EXISTS idx_live_calls_started_at ON live_calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_calls_user_id ON live_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_live_calls_is_active ON live_calls(is_active);

CREATE INDEX IF NOT EXISTS idx_transcript_events_call_id ON live_transcript_events(call_id);
CREATE INDEX IF NOT EXISTS idx_transcript_events_timestamp ON live_transcript_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transcript_events_speaker ON live_transcript_events(speaker);

CREATE INDEX IF NOT EXISTS idx_supervisor_sessions_supervisor ON supervisor_sessions(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_sessions_call ON supervisor_sessions(call_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_sessions_active ON supervisor_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_call_interventions_call_id ON call_interventions(call_id);
CREATE INDEX IF NOT EXISTS idx_call_interventions_supervisor ON call_interventions(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_call_interventions_timestamp ON call_interventions(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_call_id ON call_quality_metrics(call_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_type ON call_quality_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_timestamp ON call_quality_metrics(timestamp DESC);

-- Create update trigger for live_calls
CREATE OR REPLACE FUNCTION update_live_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER live_calls_updated_at_trigger
    BEFORE UPDATE ON live_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_live_calls_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE live_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_transcript_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Supervisors can see calls based on their permissions
CREATE POLICY live_calls_supervisor_policy ON live_calls
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'supervisor')
        )
    );

-- Transcript events follow call access permissions
CREATE POLICY transcript_events_policy ON live_transcript_events
    FOR ALL TO authenticated
    USING (
        call_id IN (
            SELECT call_id FROM live_calls 
            WHERE user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'superadmin', 'supervisor')
            )
        )
    );

-- Supervisor sessions are managed by supervisors
CREATE POLICY supervisor_sessions_policy ON supervisor_sessions
    FOR ALL TO authenticated
    USING (
        supervisor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin')
        )
    );

-- Interventions follow supervisor permissions
CREATE POLICY call_interventions_policy ON call_interventions
    FOR ALL TO authenticated
    USING (
        supervisor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin')
        )
    );

-- Quality metrics follow call permissions
CREATE POLICY quality_metrics_policy ON call_quality_metrics
    FOR ALL TO authenticated
    USING (
        call_id IN (
            SELECT call_id FROM live_calls 
            WHERE user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'superadmin', 'supervisor')
            )
        )
    );

-- Live call monitoring view
CREATE OR REPLACE VIEW live_call_monitor AS
SELECT 
    lc.call_id,
    lc.user_id,
    lc.caller_number,
    lc.call_type,
    lc.status,
    lc.started_at,
    lc.duration_seconds,
    lc.agent_name,
    lc.customer_name,
    lc.intervention_count,
    u.full_name as user_name,
    u.email as user_email,
    COUNT(ss.id) as supervisor_count,
    MAX(lte.timestamp) as last_transcript_time,
    CASE 
        WHEN MAX(lte.timestamp) > NOW() - INTERVAL '10 seconds' THEN 'active'
        WHEN MAX(lte.timestamp) > NOW() - INTERVAL '30 seconds' THEN 'slow'
        ELSE 'inactive'
    END as activity_status
FROM live_calls lc
LEFT JOIN users u ON lc.user_id = u.id
LEFT JOIN supervisor_sessions ss ON lc.call_id = ss.call_id AND ss.is_active = true
LEFT JOIN live_transcript_events lte ON lc.call_id = lte.call_id
WHERE lc.is_active = true
GROUP BY lc.call_id, lc.user_id, lc.caller_number, lc.call_type, lc.status, 
         lc.started_at, lc.duration_seconds, lc.agent_name, lc.customer_name, 
         lc.intervention_count, u.full_name, u.email;

-- Call performance summary view
CREATE OR REPLACE VIEW call_performance_summary AS
SELECT 
    DATE(lc.started_at) as call_date,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN lc.status = 'ended' THEN 1 END) as completed_calls,
    AVG(lc.duration_seconds) as avg_duration,
    COUNT(CASE WHEN lc.intervention_count > 0 THEN 1 END) as calls_with_interventions,
    AVG(lc.intervention_count) as avg_interventions_per_call,
    COUNT(DISTINCT ss.supervisor_id) as active_supervisors
FROM live_calls lc
LEFT JOIN supervisor_sessions ss ON lc.call_id = ss.call_id
WHERE lc.started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(lc.started_at)
ORDER BY call_date DESC;