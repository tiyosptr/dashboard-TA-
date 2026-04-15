import { createClient } from '@supabase/supabase-js';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

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
      broadcast({ type: 'CYCLE_TIME_UPDATE', machine_id: payload.new.machine_id });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'troughput_machine' },
    (payload) => {
      console.log('🔥 Throughput Change detected:', payload.new.machine_id);
      broadcast({ type: 'THROUGHPUT_UPDATE', machine_id: payload.new.machine_id });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'data_items' },
    (payload) => {
      console.log('🔥 New Item Added (Pass/Reject):', payload.new.id);
      // Kita trigger output update agar Pass/Reject count di UI refresh
      broadcast({ type: 'OUTPUT_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'actual_output' },
    (payload) => {
      console.log('🔥 Output Change detected:', payload.new.id);
      broadcast({ type: 'OUTPUT_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'defect_by_process' },
    (payload) => {
      console.log('🔥 Defect rate inserted:', payload);
      broadcast({ type: 'DEFECT_RATE_UPDATE' });
    }
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'defect_by_process' },
    (payload) => {
      console.log('🔥 Defect rate updated:', payload);
      broadcast({ type: 'DEFECT_RATE_UPDATE' });
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
  .subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Successfully subscribed to Supabase Realtime!');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Failed to subscribe to Supabase Realtime:', err);
    } else if (status === 'TIMED_OUT') {
      console.error('⌛ Subscription timed out');
    }
  });
