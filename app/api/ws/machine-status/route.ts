/**
 * WebSocket API for real-time machine status updates
 * 
 * This endpoint handles WebSocket connections for monitoring machine status changes.
 * When a machine status changes to 'active', connected clients are notified in real-time.
 */

import { NextRequest } from 'next/server';

// Store active WebSocket connections
const clients = new Set<any>();

export async function GET(request: NextRequest) {
  // Check if the request is a WebSocket upgrade request
  const upgradeHeader = request.headers.get('upgrade');
  
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 });
  }

  // Note: Next.js doesn't natively support WebSocket upgrades in API routes
  // This is a placeholder. For production, you should use a separate WebSocket server
  // or a service like Pusher, Ably, or Socket.io
  
  return new Response(
    JSON.stringify({
      error: 'WebSocket not supported in this environment',
      message: 'Please use a dedicated WebSocket server or polling mechanism',
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Export a function to broadcast status changes (to be called from other API routes)
export function broadcastMachineStatusChange(machineId: string, newStatus: string) {
  const message = JSON.stringify({
    type: 'status_change',
    machineId,
    status: newStatus,
    timestamp: new Date().toISOString(),
  });

  // Broadcast to all connected clients
  clients.forEach((client) => {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    } catch (error) {
      console.error('[WebSocket] Error broadcasting to client:', error);
      clients.delete(client);
    }
  });
}
