-- ============================================================
-- Machine Status Log - Event Based Architecture
-- ============================================================

-- 1. Create the event log table
CREATE TABLE IF NOT EXISTS public.machine_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.machine(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'maintenance', 'on hold', 'downtime', 'inactive')),
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    duration_seconds BIGINT GENERATED ALWAYS AS (
        CASE WHEN end_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (end_time - start_time))::BIGINT
            ELSE NULL
        END
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for performance
-- Partial index: find current open event (only 1 per machine)
CREATE INDEX IF NOT EXISTS idx_msl_machine_open 
    ON public.machine_status_log (machine_id) 
    WHERE end_time IS NULL;

-- Time range queries
CREATE INDEX IF NOT EXISTS idx_msl_machine_time 
    ON public.machine_status_log (machine_id, start_time DESC);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_msl_status 
    ON public.machine_status_log (status, start_time DESC);

-- 3. Initialize: create an open event for each existing machine
INSERT INTO public.machine_status_log (machine_id, status, start_time)
SELECT id, COALESCE(status, 'inactive'), now()
FROM public.machine
WHERE id NOT IN (
    SELECT DISTINCT machine_id FROM public.machine_status_log WHERE end_time IS NULL
);
