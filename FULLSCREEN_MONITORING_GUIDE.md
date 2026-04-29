# 🖥️ Fullscreen Monitoring Guide

## 📋 Overview

Fungsi **Fullscreen Monitoring** memungkinkan Anda untuk melihat semua mesin dalam mode layar penuh dengan **automated line rotation**. Fitur ini dirancang khusus untuk **control room monitoring** dan **production floor displays**.

---

## 🚀 Fitur Utama

### 1. **Automated Line Rotation**
- Otomatis berganti line setiap 15 detik (dapat disesuaikan)
- Dapat di-pause/resume dengan satu klik
- Navigasi manual dengan tombol panah atau keyboard

### 2. **Fullscreen Mode**
- Mode layar penuh dengan F11 atau tombol fullscreen
- Exit dengan Esc atau tombol exit
- Optimized untuk display wall dan monitor besar

### 3. **Real-time Monitoring**
- Menampilkan semua data mesin secara real-time
- Status mesin dengan warna berbeda (active, maintenance, downtime, dll)
- Metrics: OEE, Output, Throughput, Cycle Time, Defect Rate

### 4. **Filtering & Search**
- Filter berdasarkan status mesin
- Search berdasarkan nama mesin
- Filter berdasarkan line

---

## 🎮 Cara Menggunakan

### **Akses dari Machine Management**
1. Buka **Management System** → **Machine Management**
2. Klik tombol **"Fullscreen Monitoring"** di header
3. Sistem akan membuka mode fullscreen dengan line yang sedang difilter

### **Keyboard Shortcuts**
| Shortcut | Fungsi |
|----------|--------|
| **F11** | Toggle fullscreen mode |
| **Esc** | Exit fullscreen/close monitoring |
| **Space** | Pause/resume auto rotation |
| **← →** | Navigasi ke line sebelumnya/selanjutnya |
| **↑ ↓** | Scroll konten (jika ada) |

### **Control Panel**
```
┌─────────────────────────────────────────────────────────────┐
│                    Control Panel                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [←] [Line 1] [Line 2] [Line 3] [Unassigned] [→]           │
│                                                              │
│  [Auto: ON (15s)]      [Fullscreen]      [⚙ Settings]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Konfigurasi

### **Rotation Interval**
- Default: 15 detik
- Range: 5-60 detik
- Adjustable dari settings panel

### **Display Settings**
- **Dark Mode Only**: Optimized untuk ruangan gelap
- **High Contrast**: Warna status yang jelas
- **Large Text**: Readable dari jarak jauh

### **Filter Options**
1. **Status Filter**: Active, Maintenance, On Hold, Downtime, Inactive
2. **Line Filter**: Otomatis berdasarkan line yang dipilih
3. **Search**: Cari berdasarkan nama mesin

---

## 🎨 Tampilan Visual

### **Status Colors**
```
🟢 ACTIVE      : Green gradient
🟡 MAINTENANCE : Yellow gradient  
🟠 ON HOLD     : Orange gradient
🔴 DOWNTIME    : Red gradient
⚫ INACTIVE    : Gray gradient
```

### **Machine Card Layout**
```
┌─────────────────────────────────────────────────────────────┐
│  [Status Bar]                                               │
│  Machine Name                    [STATUS BADGE]             │
│  Process Tag | Last Maintenance                             │
│                                                              │
│  OEE: ████████████████████ 85%                              │
│                                                              │
│  Output    Throughput   Cycle Time   Defect Rate            │
│  1,234     45.6/min     12.3 sec     1.2%                  │
│                                                              │
│  Running Hours: 245h 30m                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Integrasi dengan Sistem Lain

### **API Endpoints**
```typescript
// Get machines for fullscreen monitoring
GET /api/machines?status=active&line_id=xxx

// Get real-time metrics
GET /api/machines/{id}/metrics?realtime=true
```

### **WebSocket Updates**
```javascript
// Real-time status updates
socket.on('machine-status-update', (data) => {
  updateMachineCard(data.machineId, data.status);
});

// Metrics updates every 5 seconds
socket.on('metrics-update', (data) => {
  updateMetrics(data.machineId, data.metrics);
});
```

---

## 📊 Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   API Server    │    │   Frontend      │
│   Database      │────│   (Next.js)     │────│   (React)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │ 1. Machine Data        │ 2. HTTP/WS             │ 3. Render
        │    - Status            │    - Real-time         │    - Cards
        │    - Metrics           │    - Filtered         │    - Charts
        │    - History           │    - Aggregated       │    - Stats
        ▼                        ▼                        ▼
```

---

## 🧪 Testing Scenarios

### **Scenario 1: Control Room Monitoring**
```
User: Production Supervisor
Goal: Monitor semua line secara bergantian
Steps:
1. Buka fullscreen monitoring
2. Set auto rotation ke 20s
3. Biarkan berjalan di monitor wall
4. Pantau status mesin dari jarak jauh
```

### **Scenario 2: Troubleshooting Mode**
```
User: Maintenance Technician  
Goal: Fokus pada mesin bermasalah
Steps:
1. Filter status: "downtime" dan "maintenance"
2. Pause auto rotation
3. Periksa metrics detail
4. Ambil screenshot untuk report
```

### **Scenario 3: Production Meeting**
```
User: Production Manager
Goal: Present real-time status ke tim
Steps:
1. Buka fullscreen di projector
2. Tampilkan line dengan performance terbaik/terburuk
3. Gunakan manual navigation
4. Diskusikan improvement areas
```

---

## 🛠️ Troubleshooting

### **Issue: Fullscreen Tidak Bekerja**
```
Symptom: Tombol fullscreen tidak merespon
Solution:
1. Check browser permission untuk fullscreen
2. Pastikan tidak ada popup blocker
3. Coba refresh page
4. Gunakan F11 sebagai alternatif
```

### **Issue: Auto Rotation Terlalu Cepat/Lambat**
```
Symptom: Perubahan line terlalu cepat atau lambat
Solution:
1. Buka settings panel (⚙)
2. Adjust rotation interval
3. Range: 5-60 detik
4. Save settings
```

### **Issue: Data Tidak Update**
```
Symptom: Metrics mesin stuck
Solution:
1. Klik "Refresh Data" di header
2. Check network connection
3. Verify API endpoint
4. Check Supabase connection
```

---

## 🔄 Auto Rotation Algorithm

### **Logic Flow**
```javascript
// Pseudo-code untuk auto rotation
function autoRotateLines() {
  if (!isAutoRotating || lines.length <= 1) return;
  
  const interval = setInterval(() => {
    currentLineIndex = (currentLineIndex + 1) % lines.length;
    updateDisplay(currentLine);
  }, rotationInterval * 1000);
  
  return () => clearInterval(interval);
}
```

### **Smart Rotation Features**
1. **Skip Empty Lines**: Otomatis skip line tanpa mesin
2. **Priority Lines**: Line dengan banyak downtime dapat ditampilkan lebih lama
3. **Manual Override**: User dapat pause/resume kapan saja

---

## 📈 Performance Optimization

### **Rendering Optimization**
- **Virtual Scrolling**: Hanya render mesin yang terlihat
- **Lazy Loading**: Load metrics saat diperlukan
- **Debounced Updates**: Update UI maksimal 60fps

### **Memory Management**
- **Cache Metrics**: Cache data untuk mengurangi API calls
- **Cleanup Timers**: Hapus interval saat komponen unmount
- **Efficient Re-renders**: Gunakan React.memo untuk machine cards

---

## 🎯 Use Cases

### **1. Production Control Room**
- Monitor semua line dari satu tempat
- Real-time alert untuk downtime
- Historical trend analysis

### **2. Maintenance Department**
- Quick view mesin yang perlu maintenance
- Schedule planning berdasarkan status
- Resource allocation optimization

### **3. Management Reporting**
- Daily production review
- Performance metrics visualization
- KPI tracking dan reporting

### **4. Training & Onboarding**
- Demo sistem monitoring untuk new hires
- Visual training material
- Procedure demonstration

---

## 🔐 Security Considerations

### **Access Control**
- Hanya user dengan role "supervisor" atau di atasnya
- Audit log untuk semua fullscreen sessions
- Session timeout setelah 30 menit inactivity

### **Data Privacy**
- Tidak menampilkan sensitive information
- Mask machine IDs untuk public displays
- Optional blur untuk screenshots

---

## 📱 Responsive Design

### **Screen Size Adaptation**
```
Desktop (1920x1080+): 4 columns, full details
Tablet (1024x768): 3 columns, condensed details
Mobile (768x): 2 columns, essential info only
```

### **Touch Gestures**
- **Swipe Left/Right**: Navigasi antar line
- **Tap**: Select machine untuk details
- **Long Press**: Open context menu

---

## 🔄 Update & Maintenance

### **Scheduled Updates**
- **Daily**: Update component libraries
- **Weekly**: Performance optimization
- **Monthly**: Feature review dan enhancement

### **Backward Compatibility**
- Support untuk semua browser modern
- Fallback untuk non-fullscreen browsers
- Progressive enhancement strategy

---

## 📚 Documentation Links

### **Related Components**
- [Machine Management](../app/management-system/components/machines/machine-list.tsx)
- [Fullscreen Monitoring](../app/management-system/components/machines/fullscreen-monitoring.tsx)
- [Types Definition](../types/index.ts)

### **API Documentation**
- [Machines API](../app/api/machines/route.ts)
- [Real-time WebSocket](../server-ws.mjs)

### **Design System**
- [Color Palette](../design/colors.md)
- [Typography](../design/typography.md)
- [Component Library](../components/README.md)

---

## 🎉 Quick Start

### **Installation Check**
```bash
# Pastikan dependencies terinstall
npm install

# Run development server
npm run dev

# Buka browser ke
http://localhost:3000/management-system?tab=machines
```

### **First Time Setup**
1. Login dengan role supervisor
2. Navigasi ke Machine Management
3. Klik "Fullscreen Monitoring"
4. Konfigurasi settings sesuai kebutuhan
5. Start monitoring!

---

**Version:** 1.0.0  
**Last Updated:** 2026-04-30  
**Author:** System Development Team  
**Status:** ✅ Production Ready