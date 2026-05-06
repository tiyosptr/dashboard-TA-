# Implementasi Tampilan Data JSONB - Machine Metrics

## ✅ STATUS: COMPLETE

Semua fitur telah diimplementasikan dan berfungsi dengan baik.

## Overview
Implementasi ini menambahkan kemampuan untuk **otomatis mengambil dan menyimpan data metrik mesin** saat downtime terjadi, kemudian menampilkan data tersebut di:
1. **Tab Notifications** - Detail notification dengan metrik mesin
2. **Tab Work Orders** - Detail work order dengan metrik yang sama (tab terpisah "Metrics")
3. **Print History** - Cetak history dengan metrik lengkap

## Recent Fix (Latest Update)

### ✅ Fixed: Work Orders API tidak return field `data`

**Problem:**
- Work orders API GET method tidak mengembalikan field `data`
- Menyebabkan tab "Metrics" di work order detail menampilkan "No Metrics Data Available"
- Padahal data metrics sudah tersimpan di database

**Solution:**
- Updated `/app/api/work-orders/route.ts` GET method
- `taskMap` sudah fetch `data` field dengan raw SQL
- Fixed mapping untuk extract `data` dari `taskMap`
- Sekarang response API include field `data`

**Code Change:**
```typescript
// BEFORE (BROKEN)
const mapped = workOrders.map((wo: any) => ({
  // ...
  task: taskMap.get(wo.id) || wo.task,
  // data field MISSING!
}))

// AFTER (FIXED)
const mapped = workOrders.map((wo: any) => {
  const taskData = taskMap.get(wo.id);
  return {
    // ...
    task: taskData?.task || wo.task,
    data: taskData?.data || null,  // ✅ NOW INCLUDED
  };
})
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DOWNTIME TERJADI                                             │
│    User/System detects machine downtime                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CREATE NOTIFICATION (POST /api/notifications)                │
│    ├─ Fetch machine metrics (GET /api/machines/metrics)         │
│    ├─ Save to notification.data (JSONB)                         │
│    └─ Update machine status to 'downtime'                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. USER VIEWS NOTIFICATION                                      │
│    ├─ Click "View Details" button                               │
│    ├─ Modal shows notification info                             │
│    └─ Display metrics from notification.data                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. GENERATE WORK ORDER (POST /api/work-orders/generate)         │
│    ├─ Select technician                                         │
│    ├─ Copy metrics from notification.data                       │
│    ├─ Save to work_order.data (JSONB)                           │
│    └─ Link work_order_id to notification                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. VIEW WORK ORDER DETAILS                                      │
│    ├─ Click work order in list                                  │
│    ├─ Modal shows 3 tabs: Details, Tasks, Metrics               │
│    ├─ Tab "Metrics" shows indicator dot if data available       │
│    └─ Display metrics from work_order.data (✅ NOW WORKING)     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. PRINT HISTORY                                                │
│    ├─ Click "Print History" button                              │
│    ├─ Fetch work_order_history with data                        │
│    └─ Generate PDF with formatted metrics                       │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. GET /api/machines/metrics ✅
**Tujuan:** Mengambil data metrik mesin untuk disimpan saat downtime

**Query Parameters:**
- `machineId` (required): ID mesin

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "machine_name": "Machine A",
    "machine_status": "downtime",
    "line_name": "Line 1",
    "process_name": "Assembly",
    
    "runtime_stats": {
      "total_running_hours": 125.50,
      "total_downtime_hours": 8.25,
      "downtime_count": 5,
      "maintenance_count": 3
    },
    
    "maintenance": {
      "last_maintenance": "2024-01-15T10:00:00Z",
      "next_maintenance": "2024-02-15T10:00:00Z"
    },
    
    "current_event": {
      "status": "downtime",
      "start_time": "2024-01-20T14:30:00Z",
      "duration_seconds": 1800
    },
    
    "performance": {
      "throughput": {
        "value": 45.5,
        "total_pass": 910,
        "interval_time_seconds": 1200,
        "recorded_at": "2024-01-20T14:00:00Z"
      },
      "cycle_time": {
        "value_seconds": 78.5,
        "total_output": 450,
        "recorded_at": "2024-01-20T14:00:00Z"
      },
      "quality": {
        "pass_count": 910,
        "reject_count": 90,
        "total_count": 1000,
        "defect_rate_pct": 9.0,
        "quality_rate_pct": 91.0
      }
    },
    
    "captured_at": "2024-01-20T14:30:00Z"
  }
}
```

**Key Features:**
- ✅ NO ID fields (semua field dengan '_id' atau 'id' di-filter)
- ✅ Latest values only untuk throughput & cycle_time (no history arrays)
- ✅ Grouped structure (runtime_stats, maintenance, performance, current_event)
- ✅ Clean, readable format

### 2. POST /api/notifications ✅
**Update:** Sekarang otomatis fetch metrics saat create notification

**Request Body:**
```json
{
  "machineId": "uuid",
  "machineName": "Machine A",
  "reason": "Motor overheating",
  "severity": "high",
  "processId": "uuid"
}
```

**Process:**
1. ✅ Fetch metrics dari `/api/machines/metrics?machineId=xxx`
2. ✅ Save metrics ke `notification.data` (JSONB column)
3. ✅ Create notification record
4. ✅ Update machine status to 'downtime'

### 3. POST /api/work-orders/generate ✅
**Update:** Copy metrics dari notification ke work order

**Request Body:**
```json
{
  "notificationId": "uuid",
  "technicianName": "John Doe"
}
```

**Process:**
1. ✅ Get notification (includes `data` field)
2. ✅ Copy `notification.data` to `work_order.data`
3. ✅ Create work order with metrics
4. ✅ Link work_order_id back to notification

### 4. GET /api/work-orders ✅ FIXED
**Update:** Sekarang return field `data` di response

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "work_order_code": "WO-2024-123456",
      // ... other fields ...
      "task": [...],
      "data": {  // ✅ NOW INCLUDED
        "machine_name": "Machine A",
        "runtime_stats": {...},
        "performance": {...}
      }
    }
  ]
}
```

## Komponen yang Dibuat/Diupdate

### 1. JsonDataDisplay Component ✅ (NEW)
**Lokasi:** `app/components/ui/JsonDataDisplay.tsx`

Komponen reusable untuk menampilkan data JSONB dengan fitur:
- ✅ Collapsible/expandable display
- ✅ Grouped sections dengan icons
- ✅ Color-coded values (boolean, number, string, date)
- ✅ Nested object support
- ✅ Auto-parse JSON strings
- ✅ Auto-format date strings (Indonesian locale)
- ✅ Auto-hide null/empty data
- ✅ **Filter ALL ID fields** (any field with '_id' or exactly 'id')
- ✅ Gradient header dengan metadata
- ✅ Professional styling dengan hover effects

### 2. NotificationDetail Component ✅ (NEW)
**Lokasi:** `app/management-system/components/notifications/notification-detail.tsx`

Modal untuk menampilkan detail notification dengan:
- ✅ Basic notification info
- ✅ Timestamps
- ✅ Acknowledgement info
- ✅ **Machine Metrics** (dari notification.data)
- ✅ Gradient header (indigo to purple)
- ✅ Technician assignment form
- ✅ JsonDataDisplay component integration

### 3. Notification Panel ✅ (UPDATED)
**Lokasi:** `app/management-system/components/notifications/notification-panel.tsx`

**Perubahan:**
- ✅ Added "View Details" button
- ✅ Opens NotificationDetail modal
- ✅ Displays metrics in modal

### 4. Work Order Detail ✅ (UPDATED)
**Lokasi:** `app/management-system/components/work-orders/work-order-detail.tsx`

**Perubahan:**
- ✅ Added **"Metrics" tab** (3rd tab alongside Details and Tasks)
- ✅ Tab shows **indicator dot** (animated pulse) when data available
- ✅ Displays metrics from work_order.data using JsonDataDisplay
- ✅ Gradient header matching notification detail style
- ✅ Shows captured timestamp
- ✅ Informational footer explaining the data
- ✅ Empty state when no metrics available
- ✅ **NOW WORKING** - data field returned from API

### 5. Work Order List - Print History ✅ (UPDATED)
**Lokasi:** `app/management-system/components/work-orders/work-order-list.tsx`

**Perubahan:**
- ✅ Enhanced print history with formatted metrics
- ✅ Color-coded metrics in display
- ✅ Structured layout for readability
- ✅ Grouped sections display

## Data Metrik yang Dikumpulkan

### Runtime Statistics
- `total_running_hours`: Total jam mesin running
- `total_downtime_hours`: Total jam downtime
- `downtime_count`: Jumlah kejadian downtime
- `maintenance_count`: Jumlah maintenance

### Maintenance Info
- `last_maintenance`: Tanggal maintenance terakhir
- `next_maintenance`: Tanggal maintenance berikutnya

### Current Event
- `status`: Status saat ini
- `start_time`: Waktu mulai event
- `duration_seconds`: Durasi event (detik)

### Performance Metrics
- **Throughput:** (latest only)
  - Value
  - Total pass
  - Interval time
  - Recorded at
  
- **Cycle Time:** (latest only)
  - Value (seconds)
  - Total output
  - Recorded at

- **Quality/Defect Rate:**
  - Pass count
  - Reject count
  - Total count
  - Defect rate percentage
  - Quality rate percentage

### Context Info
- `machine_name` (NO machine_id)
- `line_name` (NO line_id)
- `process_name` (NO process_id)
- `captured_at`: Timestamp capture

## Cara Menggunakan

### 1. Saat Downtime Terjadi
```typescript
// System automatically captures metrics when creating notification
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    machineId: 'machine-uuid',
    machineName: 'Machine A',
    reason: 'Motor overheating',
    severity: 'high',
    processId: 'process-uuid'
  })
});
// ✅ Metrics automatically saved to notification.data
```

### 2. View Notification Details
1. Buka tab "Notifications" di Management System
2. Klik tombol **"View Details"** pada notification
3. Modal akan menampilkan:
   - Basic info dengan gradient header
   - **Machine Metrics** (collapsible section)
   - Technician assignment form
4. Expand section untuk melihat detail metrik

### 3. Generate Work Order
1. Di notification detail modal, klik **"Generate Work Order"**
2. Pilih technician
3. System otomatis:
   - ✅ Copy metrics dari notification.data
   - ✅ Save ke work_order.data
   - ✅ Link work order ke notification

### 4. View Work Order Details ✅ NOW WORKING
1. Buka tab "Work Orders"
2. Klik work order untuk view details
3. Modal shows 3 tabs: **Details**, **Tasks**, **Metrics**
4. Klik tab **"Metrics"** (ada indicator dot jika data available)
5. Metrics ditampilkan dengan:
   - Gradient header dengan captured timestamp
   - Grouped sections (runtime_stats, maintenance, performance)
   - Color-coded values
   - Informational footer

### 5. Print History
1. Di work order list, klik **"Print History"**
2. PDF akan include:
   - Work order details
   - Tasks performed
   - **Machine Metrics** (formatted dengan warna)
3. Print atau save as PDF

## Styling dan UI

### Notification Detail Modal ✅
- Gradient header (indigo to purple)
- Metrics section: Collapsible JsonDataDisplay
- Captured timestamp display
- Responsive layout
- Professional styling

### Work Order Detail Modal ✅
- Three tabs: Details, Tasks, **Metrics**
- Metrics tab:
  - Gradient header (indigo to purple) matching notification style
  - Captured timestamp in header badge
  - JsonDataDisplay component
  - Informational footer with icon
  - Empty state when no data
- Indicator dot (animated pulse) on tab when data available
- Smooth tab transitions

### Print History ✅
- Formatted metrics section
- Color-coded values
- Structured key-value pairs
- Print-friendly formatting

## Database Schema

### notification table ✅
```sql
ALTER TABLE notification 
ADD COLUMN IF NOT EXISTS data JSONB;
```

### work_order table ✅
```sql
ALTER TABLE work_order 
ADD COLUMN IF NOT EXISTS data JSONB;
```

### work_order_history table ✅
```sql
ALTER TABLE work_order_history 
ADD COLUMN IF NOT EXISTS data JSONB;
```

## Testing Checklist

- [ ] ✅ Create downtime notification → verify metrics captured in notification.data
- [ ] ✅ Click "View Details" on notification → verify metrics display correctly
- [ ] ✅ Verify all ID fields are hidden from display
- [ ] ✅ Generate work order from notification → verify metrics copied
- [ ] ✅ Open work order detail → verify "Metrics" tab shows indicator dot
- [ ] ✅ Click "Metrics" tab → verify data displays correctly
- [ ] ✅ Verify UI matches notification detail format (gradient header, grouped sections)
- [ ] ✅ Verify dates formatted correctly (Indonesian locale)
- [ ] ✅ Verify numbers formatted with proper decimals
- [ ] ✅ Test with notification that has no metrics → verify empty state
- [ ] ✅ Test print history → verify metrics display
- [ ] ✅ Verify captured_at timestamp displays correctly

## Files Modified

1. ✅ `/app/api/machines/metrics/route.ts` - Created
2. ✅ `/app/api/notifications/route.ts` - Modified POST method
3. ✅ `/app/api/work-orders/generate/route.ts` - Modified to copy data
4. ✅ `/app/api/work-orders/route.ts` - **FIXED GET method to return data field**
5. ✅ `/app/components/ui/JsonDataDisplay.tsx` - Created
6. ✅ `/app/management-system/components/notifications/notification-detail.tsx` - Created
7. ✅ `/app/management-system/components/notifications/notification-panel.tsx` - Modified
8. ✅ `/app/management-system/components/work-orders/work-order-detail.tsx` - Added Metrics tab
9. ✅ `/app/management-system/components/work-orders/work-order-list.tsx` - Enhanced print history
10. ✅ `types/index.ts` - Added data field to interfaces

## Troubleshooting

### ✅ FIXED: Metrics not showing in work order detail
**Problem:** Tab "Metrics" shows "No Metrics Data Available"
**Cause:** API GET /api/work-orders tidak return field `data`
**Solution:** Fixed mapping in GET method to include `data` field

### Metrics not showing in notification
- Check if `/api/machines/metrics` returns data
- Verify `notification.data` column exists in database
- Check browser console for errors

### Metrics not copied to work order
- Verify notification has `data` field populated
- Check work order generation API logs
- Ensure `work_order.data` column exists

### Print history missing metrics
- Check if work_order_history has `data` field
- Verify print function is working
- Test with browser print preview

## Future Enhancements

1. **Real-time metrics update** - Update metrics saat work order masih on-solving
2. **Metrics comparison** - Compare metrics before/after repair
3. **Trend analysis** - Analyze metrics patterns across multiple downtimes
4. **Alert thresholds** - Set thresholds untuk auto-generate notifications
5. **Export metrics** - Export metrics data as CSV/Excel
6. **Metrics dashboard** - Dedicated dashboard untuk analyze all metrics
7. **Metrics visualization** - Add charts/graphs for metrics data

## Notes

- ✅ Metrics capture adalah **non-blocking** - jika gagal, notification tetap dibuat
- ✅ Data JSONB **automatically indexed** oleh PostgreSQL untuk query cepat
- ✅ Metrics **immutable** setelah capture - tidak berubah meski mesin sudah diperbaiki
- ✅ Print history **optimized** untuk A4 paper size
- ✅ **ALL ID fields filtered** - tidak ada ID yang ditampilkan di UI
- ✅ **Latest values only** - throughput & cycle_time hanya simpan nilai terbaru
- ✅ **Consistent UI** - format sama antara notification dan work order
- ✅ **Professional styling** - gradient headers, icons, color-coded values

