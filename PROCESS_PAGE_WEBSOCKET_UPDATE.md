# Process Machine Detail Page - WebSocket Integration

## ✅ Changes Implemented

### 1. Removed Availability Calculation
- **Removed**: Availability percentage badge yang menampilkan `{availPct}%` di card Runtime
- **Reason**: Sesuai permintaan untuk menghilangkan perhitungan availability dari halaman ini

**Before:**
```tsx
{availPct !== null && (
  <div className="hidden sm:flex flex-col items-center bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex-shrink-0">
    <p className="text-lg font-black text-emerald-700">{availPct}%</p>
    <p className="text-[10px] text-slate-400 font-semibold">Availability</p>
  </div>
)}
```

**After:**
```tsx
// Badge removed completely
```

### 2. Integrated SWR for Data Fetching
- **Added**: `useSWR` hooks untuk data fetching dengan caching dan revalidation
- **Benefits**:
  - Automatic caching
  - Optimistic UI updates
  - Easy revalidation with `mutate()`
  - Better error handling
  - Reduced unnecessary API calls

**Implementation:**
```tsx
const { data: statsData, error: statsError, mutate: mutateStats } = useSWR(
  machineId ? `/api/machines/${machineId}/runtime-stats` : null,
  fetcher,
  {
    refreshInterval: 0, // Disable auto-refresh, we'll use WebSocket
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  }
);

const { data: processData, error: processError } = useSWR(
  '/api/process/with-machines',
  fetcher,
  {
    refreshInterval: 0,
    revalidateOnFocus: false,
  }
);
```

### 3. WebSocket Integration with Standalone Server
- **Connected to**: `ws://localhost:3001` (standalone WebSocket server)
- **Server File**: `server-ws.mjs`
- **Auto-reconnect**: Automatically reconnects if connection is lost (5 second delay)

**WebSocket Flow:**
```
1. Client connects to ws://localhost:3001
2. Server broadcasts when database changes occur
3. Client receives message types:
   - MACHINE_STATUS_UPDATE
   - DASHBOARD_UPDATE
4. Client revalidates data using SWR mutate()
5. If status changes from downtime → active, force refresh
```

**Implementation:**
```tsx
useEffect(() => {
  const connectWebSocket = () => {
    const wsUrl = 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected to standalone server');
      ws.send(JSON.stringify({
        type: 'subscribe',
        machineId: machineId,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'MACHINE_STATUS_UPDATE' || data.type === 'DASHBOARD_UPDATE') {
        mutateStats(); // Revalidate using SWR
        
        // Check if status changed to active
        if (machine?.status?.toLowerCase() === 'downtime') {
          fetch(`/api/machines/${machineId}/runtime-stats`)
            .then(r => r.json())
            .then(json => {
              if (json.success && json.data.machine.status?.toLowerCase() === 'active') {
                console.log('[WebSocket] Machine status changed to ACTIVE!');
                mutateStats(); // Force refresh
              }
            });
        }
      }
    };

    ws.onclose = () => {
      // Auto-reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    };
  };

  connectWebSocket();

  return () => {
    // Cleanup
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) wsRef.current.close();
  };
}, [machineId, machine?.status, mutateStats]);
```

## WebSocket Server Configuration

### Server: `server-ws.mjs`

**Already Configured Listeners:**
- ✅ `machine` table UPDATE → broadcasts `DASHBOARD_UPDATE`
- ✅ `machine_status_log` INSERT → broadcasts `MACHINE_STATUS_UPDATE` + `DASHBOARD_UPDATE`
- ✅ `machine_status_log` UPDATE → broadcasts `MACHINE_STATUS_UPDATE` + `DASHBOARD_UPDATE`

**Message Types:**
- `MACHINE_STATUS_UPDATE` - Specific to machine status changes
- `DASHBOARD_UPDATE` - General dashboard data updates
- `NOTIFICATION_UPDATE` - Notification changes
- `TREND_ANALYSIS_UPDATE` - Trend analysis updates

## How It Works

### Initial Load (SWR)
1. Page loads
2. SWR fetches data from API endpoints
3. Data is cached in SWR
4. UI renders with data

### Real-time Updates (WebSocket)
1. Machine status changes in database (e.g., downtime → active)
2. Supabase Realtime detects change
3. `server-ws.mjs` receives change notification
4. Server broadcasts to all connected clients
5. Client receives WebSocket message
6. Client calls `mutateStats()` to revalidate data
7. SWR fetches fresh data from API
8. UI updates automatically

### Status Change Detection
When machine status changes from **downtime** to **active**:
1. WebSocket receives `MACHINE_STATUS_UPDATE`
2. Client checks current status is "downtime"
3. Client fetches latest status from API
4. If new status is "active", force refresh all data
5. UI updates to show active status
6. Runtime stats are recalculated

## Benefits

### 1. Real-time Updates
- ✅ No need for manual refresh
- ✅ Instant updates when status changes
- ✅ Multiple clients stay in sync

### 2. Efficient Data Fetching
- ✅ SWR caching reduces API calls
- ✅ Only revalidate when needed
- ✅ Optimistic UI updates

### 3. Better User Experience
- ✅ Automatic refresh when downtime ends
- ✅ No polling overhead
- ✅ Smooth transitions

### 4. Scalability
- ✅ Standalone WebSocket server
- ✅ Can handle multiple clients
- ✅ Auto-reconnect on connection loss

## Running the WebSocket Server

### Start Server:
```bash
node server-ws.mjs
```

### Expected Output:
```
🚀 WebSocket Server started on ws://localhost:3001
📡 Subscribing to Supabase changes...
✅ Successfully subscribed to Supabase Realtime!
```

### When Client Connects:
```
🔌 Client connected
📩 Received: {"type":"subscribe","machineId":"xxx-xxx-xxx"}
```

### When Status Changes:
```
🔥 Machine Status Log updated: xxx-xxx-xxx
Broadcasting: {"type":"MACHINE_STATUS_UPDATE"}
Broadcasting: {"type":"DASHBOARD_UPDATE"}
```

## Testing

### Test Scenario 1: Initial Load
1. Open page: `http://localhost:3000/process/[processId]/[machineId]`
2. Verify data loads correctly
3. Check console for SWR fetch logs

### Test Scenario 2: WebSocket Connection
1. Open browser console
2. Look for: `[WebSocket] Connected to standalone server`
3. Verify no connection errors

### Test Scenario 3: Status Change (Downtime → Active)
1. Set machine to downtime status
2. Open process page
3. Change machine status to active (via API or database)
4. Observe:
   - Console log: `[WebSocket] Machine status changed to ACTIVE!`
   - UI automatically updates
   - Runtime stats refresh

### Test Scenario 4: Auto-reconnect
1. Stop WebSocket server (`Ctrl+C`)
2. Observe console: `[WebSocket] Connection closed, attempting to reconnect in 5s...`
3. Restart server
4. Observe: `[WebSocket] Connected to standalone server`

## Troubleshooting

### WebSocket Connection Failed
**Problem:** `[WebSocket] Error: Connection refused`
**Solution:** 
- Ensure `server-ws.mjs` is running
- Check port 3001 is not in use
- Verify `.env` has correct Supabase credentials

### Data Not Updating
**Problem:** UI doesn't update when status changes
**Solution:**
- Check WebSocket connection in console
- Verify server is broadcasting messages
- Check SWR mutate is being called
- Verify API endpoint returns correct data

### Multiple Reconnect Attempts
**Problem:** WebSocket keeps reconnecting
**Solution:**
- Check server logs for errors
- Verify Supabase Realtime subscription is active
- Check network connectivity

## Files Modified

1. ✅ `app/process/[processId]/[machineId]/page.tsx`
   - Removed availability calculation
   - Added SWR integration
   - Added WebSocket connection
   - Added auto-refresh on status change

2. ✅ `server-ws.mjs` (already configured)
   - Listens to `machine` table updates
   - Listens to `machine_status_log` changes
   - Broadcasts `MACHINE_STATUS_UPDATE`

## Dependencies

### Required Packages:
```json
{
  "swr": "^2.x.x",
  "ws": "^8.x.x",
  "@supabase/supabase-js": "^2.x.x"
}
```

### Install if missing:
```bash
npm install swr
```

## Future Enhancements

1. **Targeted Updates**: Send machine-specific updates instead of broadcasting to all clients
2. **Connection Status Indicator**: Show WebSocket connection status in UI
3. **Offline Support**: Queue updates when offline, sync when reconnected
4. **Message Acknowledgment**: Confirm client received and processed updates
5. **Compression**: Use WebSocket compression for large payloads
6. **Authentication**: Add token-based authentication for WebSocket connections

## Notes

- ✅ WebSocket server runs independently from Next.js
- ✅ SWR handles caching and revalidation automatically
- ✅ Auto-reconnect ensures connection resilience
- ✅ No polling needed - pure event-driven updates
- ✅ Availability calculation removed as requested
- ✅ Real-time updates when status changes to active
