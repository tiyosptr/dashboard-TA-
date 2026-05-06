/**
 * GET /api/machines/metrics?machineId=xxx
 * 
 * Mengambil data metrik mesin untuk disimpan ke notification.data saat downtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: 'machineId is required' },
        { status: 400 }
      );
    }

    // 1. Get machine basic info
    const { data: machine, error: machineErr } = await supabaseAdmin
      .from('machine')
      .select('id, name_machine, status, next_maintenance, last_maintenance, total_running_hours, total_downtime_hours')
      .eq('id', machineId)
      .single();

    if (machineErr || !machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // 2. Get current open event (downtime yang sedang terjadi)
    const { data: openEvent } = await supabaseAdmin
      .from('machine_status_log')
      .select('id, status, start_time, data')
      .eq('machine_id', machineId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Calculate runtime stats from closed logs
    const { data: closedLogs } = await supabaseAdmin
      .from('machine_status_log')
      .select('status, duration_seconds')
      .eq('machine_id', machineId)
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false })
      .limit(100); // Last 100 events

    let totalRunningSeconds = 0;
    let totalDowntimeSeconds = 0;
    let downtimeCount = 0;
    let maintenanceCount = 0;

    (closedLogs || []).forEach((log: any) => {
      const status = (log.status ?? '').toLowerCase().trim();
      const secs = Number(log.duration_seconds || 0);

      if (status === 'active' || status === 'running') {
        totalRunningSeconds += secs;
      } else if (status === 'downtime') {
        totalDowntimeSeconds += secs;
        downtimeCount++;
      } else if (status === 'maintenance') {
        maintenanceCount++;
      }
    });

    // 4. Get line and process info
    const { data: processData } = await supabaseAdmin
      .from('process')
      .select(`
        id,
        name,
        line_process!inner(
          line_id,
          line:line_id(id, name)
        )
      `)
      .eq('machine_id', machineId)
      .limit(1)
      .maybeSingle();

    const lineInfo = processData?.line_process?.[0]?.line;

    // 5. Get recent throughput data (latest only)
    const { data: throughputData } = await supabaseAdmin
      .from('troughput_machine')
      .select('troughput, total_pass, interval_time, created_at')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6. Get recent cycle time data (latest only)
    const { data: cycleTimeData } = await supabaseAdmin
      .from('cycle_time_machine')
      .select('actual_cycle_time, total_output, created_at')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 7. Get recent defect rate (from data_items via line_process)
    let defectRate = null;
    if (processData?.line_process?.[0]) {
      const lineProcessId = processData.line_process[0].line_id;
      
      const { data: recentDataItems } = await supabaseAdmin
        .from('data_items')
        .select('status')
        .eq('line_process_id', lineProcessId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (recentDataItems && recentDataItems.length > 0) {
        const passCount = recentDataItems.filter((d: any) => d.status === 'pass').length;
        const rejectCount = recentDataItems.filter((d: any) => d.status === 'reject').length;
        const total = passCount + rejectCount;
        
        defectRate = {
          pass_count: passCount,
          reject_count: rejectCount,
          total_count: total,
          defect_rate_pct: total > 0 ? parseFloat(((rejectCount / total) * 100).toFixed(2)) : 0,
          quality_rate_pct: total > 0 ? parseFloat(((passCount / total) * 100).toFixed(2)) : 100,
        };
      }
    }

    // 8. Compile metrics data (clean structure without IDs)
    const metricsData = {
      // Machine Info (no IDs)
      machine_name: machine.name_machine,
      machine_status: machine.status,
      line_name: lineInfo?.name || null,
      process_name: processData?.name || null,
      
      // Runtime Statistics
      runtime_stats: {
        total_running_hours: parseFloat((totalRunningSeconds / 3600).toFixed(2)),
        total_downtime_hours: parseFloat((totalDowntimeSeconds / 3600).toFixed(2)),
        downtime_count: downtimeCount,
        maintenance_count: maintenanceCount,
      },
      
      // Maintenance Schedule
      maintenance: {
        last_maintenance: machine.last_maintenance,
        next_maintenance: machine.next_maintenance,
      },
      
      // Current Event (if in downtime)
      current_event: openEvent ? {
        status: openEvent.status,
        start_time: openEvent.start_time,
        duration_seconds: Math.floor((Date.now() - new Date(openEvent.start_time).getTime()) / 1000),
      } : null,
      
      // Performance Metrics (latest only)
      performance: {
        throughput: throughputData ? {
          value: parseFloat(Number(throughputData.troughput || 0).toFixed(2)),
          total_pass: Number(throughputData.total_pass || 0),
          interval_time_seconds: Number(throughputData.interval_time || 0),
          recorded_at: throughputData.created_at,
        } : null,
        
        cycle_time: cycleTimeData ? {
          value_seconds: parseFloat(Number(cycleTimeData.actual_cycle_time || 0).toFixed(2)),
          total_output: Number(cycleTimeData.total_output || 0),
          recorded_at: cycleTimeData.created_at,
        } : null,
        
        quality: defectRate,
      },
      
      // Metadata
      captured_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: metricsData,
    });
  } catch (error: any) {
    console.error('[Machine Metrics API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
