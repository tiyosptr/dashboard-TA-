const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Adding total_downtime_hours column...');
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "public"."machine" ADD COLUMN IF NOT EXISTS "total_downtime_hours" text NULL`);
        console.log('Column total_downtime_hours added.');
    } catch (error) {
        console.error('Error adding column:', error);
    }

    console.log('Updating db function split_open_status_events...');
    const fnSql = `
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
    -- 2a. Update machine running hours ONLY for 'active' status
    update_machines_active AS (
        UPDATE public.machine
        SET total_running_hours = (
            COALESCE(NULLIF(total_running_hours, ''), '0')::NUMERIC + 
            (c.duration_sec / 3600.0)
        )::TEXT
        FROM closed_events c
        WHERE public.machine.id = c.machine_id AND c.status = 'active'
    ),
    -- 2b. Update machine downtime hours ONLY for 'downtime' status
    update_machines_downtime AS (
        UPDATE public.machine
        SET total_downtime_hours = (
            COALESCE(NULLIF(total_downtime_hours, ''), '0')::NUMERIC + 
            (c.duration_sec / 3600.0)
        )::TEXT
        FROM closed_events c
        WHERE public.machine.id = c.machine_id AND c.status = 'downtime'
    )
    -- 3. Insert new open events for ALL closed machines
    INSERT INTO public.machine_status_log (machine_id, status, start_time)
    SELECT machine_id, status, now_time
    FROM closed_events;
END;
$$ LANGUAGE plpgsql;
  `;
    try {
        await prisma.$executeRawUnsafe(fnSql);
        console.log('Function updated.');
    } catch (error) {
        console.error('Error updating function:', error);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
