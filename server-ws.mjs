import { createClient } from '@supabase/supabase-js';
import WebSocket, { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

// Polyfill WebSocket globally so Supabase Realtime doesn't time out in Node!
globalThis.WebSocket = WebSocket;

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create WebSocket Server on port 3001
const wss = new WebSocketServer({ port: 3001 });

console.log('🚀 WebSocket Server started on ws://localhost:3001');

wss.on('connection', (ws) => {
  console.log('🔌 Client connected');

  ws.on('message', (message) => {
    console.log('📩 Received:', message.toString());
    // Handle messages if needed
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});

// Broadcast Helper
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(JSON.stringify(data));
    }
  });
}

// Subscribe to Supabase database changes
console.log('📡 Subscribing to Supabase changes...');

supabase
  .channel('db-changes')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'cycle_time_machine' },
    (payload) => {
      console.log('🔥 Cycle Time Change detected:', payload.new.machine_id);
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'troughput_machine' },
    (payload) => {
      console.log('🔥 Throughput Change detected:', payload.new.machine_id);
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'troughput_line' },
    (payload) => {
      console.log('🔥 Line Throughput Change detected:', payload.new.line_id);
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'troughput_line' },
    (payload) => {
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'data_items' },
    (payload) => {
      console.log('🔥 New Item Added (Pass/Reject):', payload.new.id);
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'actual_output' },
    (payload) => {
      console.log('🔥 Output Change detected:', payload.new.id);
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'defect_by_process' },
    (payload) => {
      console.log('🔥 Defect rate inserted:', payload);
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'defect_by_process' },
    (payload) => {
      console.log('🔥 Defect rate updated:', payload);
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notification' },
    (payload) => {
      console.log('🔥 New notification inserted:', payload.new.id);
      broadcast({ type: 'NOTIFICATION_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'notification' },
    (payload) => {
      console.log('🔥 Notification updated:', payload.new.id);
      broadcast({ type: 'NOTIFICATION_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'cycle_time_line' },
    (payload) => {
      console.log('🔥 Line Cycle Time Change detected:', payload.new.line_id);
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'machine' },
    (payload) => {
      console.log('🔥 Machine Status Change detected:', payload.new.id);
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'oee_summary' },
    (payload) => {
      console.log('🔥 OEE Change detected');
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'trend_analysis' },
    (payload) => {
      console.log('🔥 Trend Analysis inserted:', payload.new.id);
      broadcast({ type: 'TREND_ANALYSIS_UPDATE' });
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'trend_analysis' },
    (payload) => {
      console.log('🔥 Trend Analysis updated:', payload.new.id);
      broadcast({ type: 'TREND_ANALYSIS_UPDATE' });
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'trend_analysis' },
    (payload) => {
      console.log('🔥 Trend Analysis inserted:', payload.new.id);
      broadcast({ type: 'TREND_ANALYSIS_UPDATE' });
      broadcast({ type: 'DASHBOARD_UPDATE' }); // Also trigger general dashboard update
    }
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'trend_analysis' },
    (payload) => {
      console.log('🔥 Trend Analysis updated:', payload.new.id);
      broadcast({ type: 'TREND_ANALYSIS_UPDATE' });
      broadcast({ type: 'DASHBOARD_UPDATE' }); // Also trigger general dashboard update
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'machine_status_log' },
    (payload) => {
      console.log('🔥 Machine Status Log inserted:', payload.new.machine_id);
      broadcast({ type: 'MACHINE_STATUS_UPDATE' });
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'machine_status_log' },
    (payload) => {
      console.log('🔥 Machine Status Log updated:', payload.new.machine_id);
      broadcast({ type: 'MACHINE_STATUS_UPDATE' });
      broadcast({ type: 'DASHBOARD_UPDATE' });
    }
  )
  .subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Successfully subscribed to Supabase Realtime!');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Failed to subscribe to Supabase Realtime:', err);
    } else if (status === 'TIMED_OUT') {
      console.error('⌛ Subscription timed out');
    }
  });
