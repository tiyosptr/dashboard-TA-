import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lineId = searchParams.get('lineId');

    // Buat array 7 hari terakhir
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    // Query untuk mengambil data dari berbagai tabel
    const promises = last7Days.map(async (date) => {
      // 1. Output dari data_items (bukan actual_output)
      // Ambil semua line_process untuk line ini
      let lineProcessIds: string[] = [];
      if (lineId) {
        const { data: lpData } = await supabaseAdmin
          .from('line_process')
          .select('id, process:process_id(name)')
          .eq('line_id', lineId)
          .order('process_order', { ascending: false });

        // Cari VIFG atau ambil proses terakhir
        const vifgRow = (lpData ?? []).find(p => (p.process as any)?.name?.toUpperCase() === 'VIFG') 
                        || (lpData ? lpData[0] : null);
        
        if (vifgRow) {
          lineProcessIds = [vifgRow.id];
        }
      }

      // Query data_items untuk output (pass + reject)
      let outputQuery = supabaseAdmin
        .from('data_items')
        .select('status, line_process_id')
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`)
        .in('status', ['pass', 'reject']);

      if (lineProcessIds.length > 0) {
        outputQuery = outputQuery.in('line_process_id', lineProcessIds);
      }

      const { data: outputData } = await outputQuery;

      // Hitung total output dari data_items
      const totalPass = outputData?.filter(item => item.status === 'pass').length || 0;
      const totalReject = outputData?.filter(item => item.status === 'reject').length || 0;
      const totalOutput = totalPass + totalReject;

      // Ambil target dari actual_output (untuk efficiency calculation)
      const { data: targetData } = await supabaseAdmin
        .from('actual_output')
        .select('target_output')
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`)
        .limit(1)
        .maybeSingle();

      const totalTarget = targetData?.target_output ? Number(targetData.target_output) * 24 : 2400; // 100 per jam * 24 jam

      // 2. Quality dari defect_by_process
      let qualityQuery = supabaseAdmin
        .from('defect_by_process')
        .select('total_produced, total_pass, total_reject')
        .eq('recorded_date', date);

      if (lineId) {
        qualityQuery = qualityQuery.eq('line_id', lineId);
      }

      const { data: qualityData } = await qualityQuery;

      // 3. Downtime dari machine_status_log
      // Untuk simplifikasi, ambil semua downtime lalu filter di aplikasi jika perlu
      let downtimeQuery = supabaseAdmin
        .from('machine_status_log')
        .select('duration_seconds, machine_id')
        .eq('status', 'downtime')
        .gte('start_time', `${date}T00:00:00`)
        .lt('start_time', `${date}T23:59:59`)
        .not('duration_seconds', 'is', null);

      const { data: downtimeData } = await downtimeQuery;

      // Jika lineId ada, filter machine yang terkait dengan line tersebut
      let filteredDowntimeData = downtimeData || [];
      if (lineId && downtimeData && downtimeData.length > 0) {
        // Ambil machine IDs yang terkait dengan line
        const { data: machinesInLine } = await supabaseAdmin
          .from('process')
          .select('machine_id, line_process!inner(line_id)')
          .eq('line_process.line_id', lineId);

        const machineIds = machinesInLine?.map(m => m.machine_id) || [];
        filteredDowntimeData = downtimeData.filter(d => machineIds.includes(d.machine_id));
      }

      // Hitung agregat untuk hari ini
      // totalOutput sudah dihitung dari data_items di atas

      const totalProduced = qualityData?.reduce((sum, item) => sum + (item.total_produced || 0), 0) || 0;
      const totalPassFromQuality = qualityData?.reduce((sum, item) => sum + (item.total_pass || 0), 0) || 0;

      const totalDowntimeSeconds = filteredDowntimeData.reduce((sum, item) => sum + (item.duration_seconds || 0), 0);
      const downtimeCount = filteredDowntimeData.length;

      // Hitung metrics
      // Gunakan data dari data_items untuk quality yang lebih akurat
      const quality = totalOutput > 0 ? ((totalPass / totalOutput) * 100) : 0;
      const efficiency = totalTarget > 0 ? ((totalOutput / totalTarget) * 100) : 0;
      const downtimeHours = totalDowntimeSeconds / 3600;

      console.log(`[trend-analysis API] Date ${date}: Output=${totalOutput} (Pass=${totalPass}, Reject=${totalReject}), Target=${totalTarget}, Quality=${quality.toFixed(2)}%, Efficiency=${efficiency.toFixed(2)}%`);

      return {
        date: new Date(date).getDate().toString().padStart(2, '0'),
        fullDate: date,
        output: totalOutput,
        quality: parseFloat(quality.toFixed(2)),
        efficiency: parseFloat(efficiency.toFixed(2)),
        downtime: parseFloat(downtimeHours.toFixed(2)),
        downtimeCount,
        totalDowntimeSeconds
      };
    });

    const result = await Promise.all(promises);

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('Error in trend analysis API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
