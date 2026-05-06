# Machine Logs Print History Feature

## ✅ Implementation Complete

Telah ditambahkan fungsi **Print History** pada halaman Machine Logs Detail di Management System.

## Location

**Page:** `/management-system/history/machine/[id]`  
**File:** `app/management-system/history/machine/[id]/page.tsx`

## Features Added

### 1. Print History Button
- **Location**: Header card, sebelah kanan bersama Total Records
- **Style**: Indigo button dengan icon printer
- **Functionality**: Membuka print preview dengan data machine logs yang sudah difilter

### 2. Print Layout
Print layout mengikuti format yang sama dengan Work Orders Print History:

#### Header Section
- **Machine Name**: Nama mesin
- **Line**: Nama line
- **Process**: Nama process
- **Total Records**: Jumlah record yang akan di-print
- **Filter Status**: Status filter yang aktif (all/active/maintenance/downtime/on hold)
- **Print Date**: Tanggal print

#### Table Content
Kolom yang ditampilkan:
1. **Date**: Tanggal event (format: DD MMM YYYY)
2. **Status**: Badge dengan warna sesuai status
   - Active/Running: Green
   - Maintenance: Blue
   - Downtime: Red
   - On Hold: Yellow
   - Inactive: Gray
3. **Tasks Performed**: List tasks yang dilakukan (jika ada)
4. **Time Interval**: 
   - Start time (dengan icon ▶)
   - End time (dengan icon ■)
5. **Duration**: Durasi dalam format hours/minutes/seconds

### 3. Styling Features

#### Status Badges
```css
- Active: Green background (#d1fae5) with dark green text
- Maintenance: Blue background (#dbeafe) with dark blue text
- Downtime: Red background (#fee2e2) with dark red text
- On Hold: Yellow background (#fef3c7) with dark yellow text
- Inactive: Gray background (#f3f4f6) with dark gray text
```

#### Duration Display
- Indigo background (#eef2ff)
- Bold indigo text (#4f46e5)
- Rounded corners with border

#### Tasks Display
- Checkmark icon (green square) untuk setiap task
- List format dengan proper spacing
- Gray text untuk task description

## Code Implementation

### Button Component
```tsx
<button
  onClick={handlePrintHistory}
  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-100 hover:shadow-xl hover:shadow-indigo-200 active:scale-95"
>
  <Printer size={18} />
  Print History
</button>
```

### Print Function
```tsx
const handlePrintHistory = () => {
  try {
    // Generate HTML content with inline styles
    const printContent = `...`;
    
    // Open new window
    const printWindow = window.open('', '', 'width=1000,height=800');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  } catch (err) {
    console.error('Print history error:', err);
    alert('Error printing history');
  }
};
```

## Data Flow

1. User clicks machine card di History tab
2. Navigate ke `/management-system/history/machine/[machineId]`
3. Page loads machine logs via API: `/api/machines/history/status-logs?machineId=xxx`
4. User dapat filter by status (all/active/maintenance/downtime/on hold)
5. User clicks "Print History" button
6. System generates HTML print layout dengan filtered data
7. Opens print preview window
8. User dapat print atau save as PDF

## Comparison with Work Orders Print History

### Similarities ✅
- Same print layout structure (header + table)
- Same styling approach (inline CSS)
- Same meta information display
- Same status badge colors
- Same duration formatting
- Same print window behavior

### Differences
- **Data Source**: Machine logs vs Work order history
- **Columns**: Different columns sesuai data type
  - Machine Logs: Date, Status, Tasks, Time Interval, Duration
  - Work Orders: Date, Event Type, Duration, Resolved By, Actions/Description
- **Filter**: Machine logs filter by status, Work orders tidak ada filter di print
- **Tasks Display**: Machine logs show tasks in table cell, Work orders show in separate section

## UI/UX Features

### Button Placement
- Positioned di header card, sebelah kanan
- Prominent indigo color untuk visibility
- Icon printer untuk clarity
- Hover effects untuk interactivity

### Print Preview
- Opens in new window (1000x800px)
- Professional layout dengan proper spacing
- Print-friendly styling (no background colors in print mode)
- Responsive table layout
- Page break handling untuk long tables

### Error Handling
- Try-catch block untuk error handling
- Alert message jika print gagal
- Console error logging untuk debugging

## Testing Checklist

- [ ] ✅ Button appears di header card
- [ ] ✅ Button has proper styling (indigo, icon, hover effects)
- [ ] ✅ Click button opens print preview window
- [ ] ✅ Print preview shows correct machine name
- [ ] ✅ Print preview shows correct line and process
- [ ] ✅ Print preview shows correct total records
- [ ] ✅ Print preview shows current filter status
- [ ] ✅ Print preview shows print date
- [ ] ✅ Table displays all filtered logs
- [ ] ✅ Status badges have correct colors
- [ ] ✅ Tasks are displayed correctly (if any)
- [ ] ✅ Time intervals show start and end times
- [ ] ✅ Duration is formatted correctly
- [ ] ✅ Print button in preview window works
- [ ] ✅ Save as PDF works
- [ ] ✅ Empty state shows "No records found" message

## Browser Compatibility

Tested and working on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari

## Future Enhancements

1. **Export to PDF**: Direct PDF export tanpa print dialog
2. **Export to Excel**: Export data ke Excel format
3. **Date Range Filter**: Filter by date range di print preview
4. **Custom Columns**: Allow user memilih kolom yang mau di-print
5. **Print Settings**: Page orientation, margins, etc.
6. **Email Report**: Send printed report via email
7. **Scheduled Reports**: Auto-generate dan email reports

## Files Modified

1. ✅ `app/management-system/history/machine/[id]/page.tsx`
   - Added Printer icon import
   - Added handlePrintHistory function
   - Added Print History button in header

## Dependencies

No new dependencies required. Uses:
- React hooks (useState, useEffect)
- Next.js routing (useParams, useRouter)
- SWR for data fetching
- Lucide icons (Printer)
- Native browser print API

## Notes

- ✅ Print layout matches Work Orders print history style
- ✅ Inline CSS untuk ensure print compatibility
- ✅ Responsive design untuk different screen sizes
- ✅ Professional styling dengan proper typography
- ✅ Color-coded status badges untuk easy identification
- ✅ Task list dengan checkmarks untuk completed tasks
- ✅ Time interval dengan visual indicators (▶ start, ■ end)
- ✅ Duration highlighted dengan indigo badge
- ✅ Print-friendly (no unnecessary backgrounds in print mode)

## Support

Jika ada issue atau pertanyaan:
1. Check browser console untuk error messages
2. Verify API endpoint returns correct data
3. Check filter status is applied correctly
4. Ensure print window popup is not blocked by browser
