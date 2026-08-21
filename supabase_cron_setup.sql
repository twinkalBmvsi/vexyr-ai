-- =========================================================================
-- VEXYR AI: SUPABASE PG_CRON SETUP SCRIPT
-- Purpose: Enables pg_cron and pg_net to schedule background jobs
--          and trigger the Next.js Auto-Followup API Endpoint.
-- =========================================================================

-- 1. Enable the required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Define the Cron Job
-- Note: Replace 'https://your-domain.com' with your actual production URL.
-- Note: The schedule '0 * * * *' runs exactly at minute 0 of every hour.
-- The authorization header must match your CRON_SECRET from environment variables.
SELECT cron.schedule(
  'auto-followups-job', -- Job Name
  '0 * * * *',          -- Schedule (Every hour on the hour)
  $$
    SELECT net.http_post(
        url := 'https://your-domain.com/api/cron/auto-followup',
        headers := '{"Authorization": "Bearer vexyr_cron_secret_123"}'::jsonb
    );
  $$
);

-- =========================================================================
-- HELPER COMMANDS (For your reference)
-- =========================================================================

-- To view running/scheduled jobs:
-- SELECT * FROM cron.job;

-- To view job execution history (logs):
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To unschedule/delete the job:
-- SELECT cron.unschedule('auto-followups-job');

-- =========================================================================
-- SCHEMA ALTERATION
-- (Run this if you haven't already updated your database schema directly)
-- =========================================================================
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS follow_up_sent BOOLEAN DEFAULT false;
