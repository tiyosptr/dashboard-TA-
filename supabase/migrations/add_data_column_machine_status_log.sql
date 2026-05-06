-- Add `data` jsonb column to machine_status_log
-- Stores a performance snapshot captured at the moment a downtime event starts.
-- Shape: { total_output, pass, reject, actual_cycle_time, actual_throughput, defect_rate, snapshot_at, shift_id, shift_name }

ALTER TABLE public.machine_status_log
  ADD COLUMN IF NOT EXISTS data jsonb;
