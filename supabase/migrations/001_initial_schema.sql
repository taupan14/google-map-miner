-- ============================================================
-- MAP MINER - Supabase Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Indonesia',
    province TEXT,
    city TEXT,
    district TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_found INTEGER DEFAULT 0,
    total_scraped INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: job_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS job_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    level TEXT NOT NULL DEFAULT 'info'
        CHECK (level IN ('info', 'success', 'warning', 'error')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: places
-- ============================================================
CREATE TABLE IF NOT EXISTS places (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    place_name TEXT NOT NULL,
    category TEXT,
    address TEXT,
    phone TEXT,
    website TEXT,
    rating NUMERIC(2,1),
    reviews INTEGER DEFAULT 0,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    maps_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Deduplication constraint
    UNIQUE (job_id, maps_url),
    UNIQUE (job_id, place_name, address)
);

-- ============================================================
-- TABLE: job_metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS job_metrics (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    total_places_found INTEGER DEFAULT 0,
    total_places_saved INTEGER DEFAULT 0,
    cpu_avg NUMERIC(5,2),
    cpu_peak NUMERIC(5,2),
    memory_avg_mb NUMERIC(10,2),
    memory_peak_mb NUMERIC(10,2),
    bandwidth_mb NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: job_resource_logs (per 5-second snapshot)
-- ============================================================
CREATE TABLE IF NOT EXISTS job_resource_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    cpu_percent NUMERIC(5,2),
    memory_mb NUMERIC(10,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_created_at ON job_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_places_job_id ON places(job_id);
CREATE INDEX IF NOT EXISTS idx_places_maps_url ON places(maps_url);
CREATE INDEX IF NOT EXISTS idx_job_resource_logs_job_id ON job_resource_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_resource_logs_recorded_at ON job_resource_logs(recorded_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Disable RLS for internal platform (enable if adding auth later)
-- ============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_resource_logs ENABLE ROW LEVEL SECURITY;

-- Allow all for service_role (backend & worker use service role key)
CREATE POLICY "service_role_all_jobs" ON jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_job_logs" ON job_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_places" ON places FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_job_metrics" ON job_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_resource_logs" ON job_resource_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow anon read for realtime (frontend uses anon key)
CREATE POLICY "anon_read_jobs" ON jobs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_job_logs" ON job_logs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_places" ON places FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_job_metrics" ON job_metrics FOR SELECT TO anon USING (true);

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE job_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE places;
ALTER PUBLICATION supabase_realtime ADD TABLE job_metrics;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get job stats for dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_jobs', (SELECT COUNT(*) FROM jobs),
        'total_places', (SELECT COUNT(*) FROM places),
        'running_jobs', (SELECT COUNT(*) FROM jobs WHERE status = 'running'),
        'success_rate', (
            SELECT CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND(
                    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*),
                    1
                )
            END
            FROM jobs WHERE status IN ('completed', 'failed')
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
