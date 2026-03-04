-- ============================================================
-- SQL Function: split_open_status_events
-- Purpose: Bulk updates machine running hours efficiently
-- ============================================================
-- Designed for 2000+ machines to run instantly (< 0.1s)
-- Logic:
-- 1. Closes ALL currently open events (end_time = NULL) with current timestamp
-- 2. If the closed event was 'active', it calculates the hours and adds to machine.total_running_hours
-- 3. Immediately opens a new event with the same status
-- 
-- Benefits:
-- - Zero load during normal operation
-- - Perfect for midnight execution to keep daily reports clean (no events spanning multiple days)
-- - Extremely fast, handles 2000+ rows via Postgres internally

CREATE OR REPLACE FUNCTION split_open_status_events()
RETURNS void AS $$
DECLARE
    now_time TIMESTAMPTZ := now();
BEGIN
    -- 1. Close all currently open events
    WITH closed_events AS (
        UPDATE public.machine_status_log
        SET end_time = now_time
        WHERE end_time IS NULL
        RETURNING machine_id, status, start_time, EXTRACT(EPOCH FROM (now_time - start_time))::BIGINT AS duration_sec
    ),
    -- 2. Update machine running hours ONLY for 'active' status
    update_machines AS (
        UPDATE public.machine
        SET total_running_hours = (
            COALESCE(NULLIF(total_running_hours, ''), '0')::NUMERIC + 
            (c.duration_sec / 3600.0)
        )::TEXT
        FROM closed_events c
        WHERE public.machine.id = c.machine_id AND c.status = 'active'
    )
    -- 3. Insert new open events for ALL closed machines
    INSERT INTO public.machine_status_log (machine_id, status, start_time)
    SELECT machine_id, status, now_time
    FROM closed_events;
END;
$$ LANGUAGE plpgsql;
