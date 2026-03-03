-- =====================================================
-- MATERIALIZED VIEW: dashboard_summary
-- Purpose: Pre-aggregate all dashboard data into a single
-- fast-read view to avoid expensive JOINs and calculations
-- on every page load. Refresh every 10 seconds via API.
-- =====================================================

-- Drop existing materialized view if exists
DROP MATERIALIZED VIEW IF EXISTS dashboard_summary;

-- Create the materialized view
CREATE MATERIALIZED VIEW dashboard_summary AS
SELECT
    -- Actual Output Summary
    COALESCE(SUM(ao.output), 0) AS total_output,
    COALESCE(SUM(ao.reject), 0) AS total_reject,
    COALESCE(SUM(ao.output) + SUM(ao.reject), 0) AS total_produced,
    COALESCE(SUM(ao.target_output), 0) AS total_target,
    CASE 
        WHEN COALESCE(SUM(ao.output) + SUM(ao.reject), 0) > 0 
        THEN ROUND((SUM(ao.output)::numeric / (SUM(ao.output) + SUM(ao.reject))::numeric) * 100, 2)
        ELSE 100.00
    END AS yield_rate,
    -- OEE Calculation
    CASE 
        WHEN COALESCE(SUM(ao.target_output), 0) > 0 
        THEN ROUND(((SUM(ao.output) + SUM(ao.reject))::numeric / SUM(ao.target_output)::numeric) * 100, 2)
        ELSE 0.00
    END AS performance_rate,
    CASE 
        WHEN COALESCE(SUM(ao.output) + SUM(ao.reject), 0) > 0 
        THEN ROUND((SUM(ao.output)::numeric / (SUM(ao.output) + SUM(ao.reject))::numeric) * 100, 2)
        ELSE 100.00
    END AS quality_rate,
    -- Machine Summary (subquery)
    (SELECT COUNT(*) FROM machine) AS total_machines,
    (SELECT COUNT(*) FROM machine WHERE status = 'running') AS running_machines,
    (SELECT COUNT(*) FROM machine WHERE status = 'warning') AS warning_machines,
    (SELECT COUNT(*) FROM machine WHERE status = 'error') AS error_machines,
    (SELECT COUNT(*) FROM machine WHERE status = 'maintenance') AS maintenance_machines,
    -- Notification Summary
    (SELECT COUNT(*) FROM notification WHERE read != 'true' OR read IS NULL) AS unread_notifications,
    (SELECT COUNT(*) FROM notification WHERE severity = 'critical' AND (acknowladged != 'true' OR acknowladged IS NULL)) AS critical_alerts,
    -- Timestamp
    NOW() AS last_refreshed
FROM actual_output ao
WHERE ao.date = CURRENT_DATE;

-- Create unique index for REFRESH CONCURRENTLY support
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_summary_unique ON dashboard_summary (last_refreshed);

-- =====================================================
-- MATERIALIZED VIEW: hourly_output_summary
-- Purpose: Pre-aggregate hourly output data
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS hourly_output_summary;

CREATE MATERIALIZED VIEW hourly_output_summary AS
SELECT
    ao.hour_slot,
    ao.shift_number,
    ao.date,
    COALESCE(SUM(ao.output), 0) AS total_output,
    COALESCE(SUM(ao.reject), 0) AS total_reject,
    COALESCE(SUM(ao.target_output), 0) AS total_target
FROM actual_output ao
WHERE ao.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ao.hour_slot, ao.shift_number, ao.date
ORDER BY ao.date DESC, ao.hour_slot ASC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_output_unique 
ON hourly_output_summary (hour_slot, shift_number, date);

-- =====================================================
-- MATERIALIZED VIEW: machine_status_summary
-- Purpose: Lightweight machine status without heavy JOINs
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS machine_status_summary;

CREATE MATERIALIZED VIEW machine_status_summary AS
SELECT
    m.id,
    m.name_machine,
    m.name_line,
    m.status,
    m.name_process,
    m.total_running_hours,
    m.next_maintenance,
    m.last_maintenance
FROM machine m
ORDER BY m.name_machine ASC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_machine_status_unique 
ON machine_status_summary (id);

-- =====================================================
-- Function to refresh all materialized views
-- Can be called via: SELECT refresh_dashboard_views();
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_output_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY machine_status_summary;
END;
$$ LANGUAGE plpgsql;
