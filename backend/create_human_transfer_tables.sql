-- Create human agent transfer tables for AI to human call handoffs

-- Human agents table
CREATE TABLE IF NOT EXISTS human_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'available', -- 'available', 'busy', 'away', 'offline'
    skills TEXT, -- JSON array of skills
    specialization VARCHAR(255),
    department VARCHAR(255),
    max_concurrent_calls INTEGER DEFAULT 3,
    current_call_count INTEGER DEFAULT 0,
    average_rating FLOAT DEFAULT 5.0,
    total_transfers_handled INTEGER DEFAULT 0,
    successful_transfers INTEGER DEFAULT 0,
    average_handling_time INTEGER DEFAULT 0, -- seconds
    languages TEXT, -- JSON array of languages
    timezone VARCHAR(100) DEFAULT 'UTC',
    work_schedule TEXT, -- JSON object with work hours
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Call transfers table
CREATE TABLE IF NOT EXISTS call_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id VARCHAR(255) UNIQUE NOT NULL,
    call_id VARCHAR(255) NOT NULL,
    from_ai_assistant VARCHAR(255),
    human_agent_id UUID REFERENCES human_agents(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    customer_context TEXT, -- JSON object
    conversation_summary TEXT,
    call_transcript TEXT,
    transfer_notes TEXT,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    initiated_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'initiated', -- 'initiated', 'queued', 'connecting', 'connected', 'completed', 'failed', 'cancelled'
    estimated_wait_time INTEGER, -- seconds
    actual_wait_time INTEGER, -- seconds
    transfer_success BOOLEAN,
    failure_reason TEXT,
    customer_satisfaction_score INTEGER, -- 1-5 rating
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfer handoffs table (detailed context for human agents)
CREATE TABLE IF NOT EXISTS transfer_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id VARCHAR(255) REFERENCES call_transfers(transfer_id) ON DELETE CASCADE,
    call_id VARCHAR(255) NOT NULL,
    human_agent_id UUID REFERENCES human_agents(id) ON DELETE CASCADE,
    handoff_summary TEXT,
    context_provided TEXT, -- JSON object with detailed context
    special_instructions TEXT,
    customer_mood VARCHAR(50),
    call_objective TEXT,
    previous_attempts TEXT, -- JSON array of previous transfer attempts
    ai_confidence_score FLOAT, -- How confident AI was before transfer
    escalation_level INTEGER DEFAULT 1, -- 1-5 escalation level
    handoff_at TIMESTAMP WITH TIME ZONE NOT NULL,
    context_acknowledged_at TIMESTAMP WITH TIME ZONE,
    human_agent_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfer queue table (for managing queued transfers)
CREATE TABLE IF NOT EXISTS transfer_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id VARCHAR(255) REFERENCES call_transfers(transfer_id) ON DELETE CASCADE,
    priority_score INTEGER NOT NULL, -- Calculated priority score
    skills_required TEXT, -- JSON array of required skills
    estimated_handle_time INTEGER, -- Expected handling time in seconds
    queue_position INTEGER,
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Agent availability schedule table
CREATE TABLE IF NOT EXISTS agent_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES human_agents(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0-6 (Sunday-Saturday)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfer performance metrics table
CREATE TABLE IF NOT EXISTS transfer_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES human_agents(id) ON DELETE CASCADE,
    transfer_id VARCHAR(255) REFERENCES call_transfers(transfer_id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_transfers INTEGER DEFAULT 0,
    successful_transfers INTEGER DEFAULT 0,
    average_handling_time INTEGER DEFAULT 0, -- seconds
    customer_satisfaction_avg FLOAT DEFAULT 0,
    first_call_resolution_rate FLOAT DEFAULT 0,
    escalation_rate FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, metric_date)
);

-- Transfer audit log for compliance
CREATE TABLE IF NOT EXISTS transfer_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'initiated', 'queued', 'assigned', 'connected', 'completed', 'cancelled'
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    details TEXT, -- JSON object with action details
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_human_agents_status ON human_agents(status);
CREATE INDEX IF NOT EXISTS idx_human_agents_user_id ON human_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_human_agents_active ON human_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_human_agents_current_calls ON human_agents(current_call_count);

CREATE INDEX IF NOT EXISTS idx_call_transfers_status ON call_transfers(status);
CREATE INDEX IF NOT EXISTS idx_call_transfers_call_id ON call_transfers(call_id);
CREATE INDEX IF NOT EXISTS idx_call_transfers_agent ON call_transfers(human_agent_id);
CREATE INDEX IF NOT EXISTS idx_call_transfers_requested_at ON call_transfers(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_transfers_priority ON call_transfers(priority);

CREATE INDEX IF NOT EXISTS idx_transfer_handoffs_transfer_id ON transfer_handoffs(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_handoffs_agent ON transfer_handoffs(human_agent_id);
CREATE INDEX IF NOT EXISTS idx_transfer_handoffs_call_id ON transfer_handoffs(call_id);

CREATE INDEX IF NOT EXISTS idx_transfer_queue_active ON transfer_queue(is_active);
CREATE INDEX IF NOT EXISTS idx_transfer_queue_priority ON transfer_queue(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_queue_queued_at ON transfer_queue(queued_at);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_agent ON agent_schedules(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_day ON agent_schedules(day_of_week);

CREATE INDEX IF NOT EXISTS idx_transfer_metrics_agent ON transfer_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_transfer_metrics_date ON transfer_metrics(metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_transfer_audit_transfer ON transfer_audit_log(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_audit_timestamp ON transfer_audit_log(timestamp DESC);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_human_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER human_agents_updated_at_trigger
    BEFORE UPDATE ON human_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_human_agents_updated_at();

CREATE OR REPLACE FUNCTION update_call_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER call_transfers_updated_at_trigger
    BEFORE UPDATE ON call_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_call_transfers_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE human_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_audit_log ENABLE ROW LEVEL SECURITY;

-- Human agents policy - users can see agents they manage or their own profile
CREATE POLICY human_agents_policy ON human_agents
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'supervisor')
        )
    );

-- Call transfers policy - users can see transfers they initiated or are assigned to
CREATE POLICY call_transfers_policy ON call_transfers
    FOR ALL TO authenticated
    USING (
        requested_by = auth.uid() OR
        human_agent_id IN (
            SELECT id FROM human_agents WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'supervisor')
        )
    );

-- Transfer handoffs follow call transfers permissions
CREATE POLICY transfer_handoffs_policy ON transfer_handoffs
    FOR ALL TO authenticated
    USING (
        human_agent_id IN (
            SELECT id FROM human_agents WHERE user_id = auth.uid()
        ) OR
        transfer_id IN (
            SELECT transfer_id FROM call_transfers 
            WHERE requested_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'superadmin', 'supervisor')
            )
        )
    );

-- Transfer queue policy - supervisors and assigned agents can see queue
CREATE POLICY transfer_queue_policy ON transfer_queue
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'supervisor')
        ) OR
        transfer_id IN (
            SELECT transfer_id FROM call_transfers 
            WHERE human_agent_id IN (
                SELECT id FROM human_agents WHERE user_id = auth.uid()
            )
        )
    );

-- Agent schedules policy - agents manage their own schedules
CREATE POLICY agent_schedules_policy ON agent_schedules
    FOR ALL TO authenticated
    USING (
        agent_id IN (
            SELECT id FROM human_agents WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'supervisor')
        )
    );

-- Transfer metrics follow agent permissions
CREATE POLICY transfer_metrics_policy ON transfer_metrics
    FOR ALL TO authenticated
    USING (
        agent_id IN (
            SELECT id FROM human_agents WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'supervisor')
        )
    );

-- Transfer audit log - supervisors and involved parties can see logs
CREATE POLICY transfer_audit_policy ON transfer_audit_log
    FOR ALL TO authenticated
    USING (
        performed_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'superadmin', 'supervisor')
        )
    );

-- Create views for common queries

-- Available agents view
CREATE OR REPLACE VIEW available_agents_view AS
SELECT 
    ha.id,
    ha.user_id,
    ha.name,
    ha.email,
    ha.phone_number,
    ha.status,
    ha.skills,
    ha.specialization,
    ha.department,
    ha.max_concurrent_calls,
    ha.current_call_count,
    ha.average_rating,
    ha.total_transfers_handled,
    ha.successful_transfers,
    ha.languages,
    u.full_name as user_full_name,
    (ha.max_concurrent_calls - ha.current_call_count) as available_capacity,
    CASE 
        WHEN ha.successful_transfers > 0 
        THEN ROUND((ha.successful_transfers::float / ha.total_transfers_handled::float) * 100, 1)
        ELSE 0 
    END as success_rate
FROM human_agents ha
LEFT JOIN users u ON ha.user_id = u.id
WHERE ha.is_active = true 
AND ha.status = 'available'
AND ha.current_call_count < ha.max_concurrent_calls;

-- Transfer performance summary view
CREATE OR REPLACE VIEW transfer_performance_summary AS
SELECT 
    DATE(ct.requested_at) as transfer_date,
    COUNT(*) as total_transfers,
    COUNT(CASE WHEN ct.status = 'completed' AND ct.transfer_success = true THEN 1 END) as successful_transfers,
    COUNT(CASE WHEN ct.status = 'failed' OR ct.transfer_success = false THEN 1 END) as failed_transfers,
    COUNT(CASE WHEN ct.status = 'cancelled' THEN 1 END) as cancelled_transfers,
    AVG(ct.actual_wait_time) as avg_wait_time,
    AVG(CASE WHEN ct.customer_satisfaction_score IS NOT NULL THEN ct.customer_satisfaction_score END) as avg_satisfaction,
    COUNT(DISTINCT ct.human_agent_id) as agents_involved
FROM call_transfers ct
WHERE ct.requested_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(ct.requested_at)
ORDER BY transfer_date DESC;

-- Agent workload view
CREATE OR REPLACE VIEW agent_workload_view AS
SELECT 
    ha.id,
    ha.name,
    ha.status,
    ha.current_call_count,
    ha.max_concurrent_calls,
    ROUND((ha.current_call_count::float / ha.max_concurrent_calls::float) * 100, 1) as utilization_rate,
    COUNT(ct.id) as pending_transfers,
    ha.average_rating,
    ha.total_transfers_handled,
    CASE 
        WHEN ha.total_transfers_handled > 0 
        THEN ROUND((ha.successful_transfers::float / ha.total_transfers_handled::float) * 100, 1)
        ELSE 0 
    END as success_rate
FROM human_agents ha
LEFT JOIN call_transfers ct ON ha.id = ct.human_agent_id AND ct.status IN ('initiated', 'queued', 'connecting')
WHERE ha.is_active = true
GROUP BY ha.id, ha.name, ha.status, ha.current_call_count, ha.max_concurrent_calls, 
         ha.average_rating, ha.total_transfers_handled, ha.successful_transfers
ORDER BY utilization_rate DESC;