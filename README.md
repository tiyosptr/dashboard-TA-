# 📊 Dashboard Monitoring Produksi - Dokumentasi Lengkap

Sistem Enterprise Monitoring Lini Produksi yang dirancang untuk manufaktur modern. Solusi ini mengintegrasikan data operasional dari database ke dashboard visual secara real-time.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Stack Teknologi](#-stack-teknologi)
3. [Panduan Instalasi](#-panduan-instalasi)
4. [Dokumentasi API](#-dokumentasi-api)
5. [Arsitektur Real-time (WebSocket)](#-arsitektur-real-time-websocket)
6. [Skema Database](#-skema-database)
7. [Struktur Folder](#-struktur-folder)

---

## 🌟 Fitur Utama
Sistem ini dirancang untuk menangani data produksi skala besar dengan metrik industri standar:

- **Dashboard Terintegrasi**: Menampilkan Actual Output, OEE, Throughput, dan Cycle Time dalam satu halaman.
- **Real-time Tracking**: Update instan setiap data baru masuk dari mesin tanpa refresh halaman.
- **Manajemen Mesin**: Detail status setiap mesin, histori pemeliharaan (maintenance), dan grafik performa per-mesin.
- **Manajemen Downtime**: Deteksi otomatis dan pelaporan downtime mesin berdasarkan status log.
- **Reporting & History**: Grafik tren produksi selama 7 hari terakhir dan histori bulanan.
- **Auto-Rotation & Tab Support**: Dukungan untuk tampilan "Dashboard" dan "Analysis" yang berputar otomatis untuk keperluan TV Monitoring.

---

## 🛠️ Stack Teknologi
| Layer | Teknologi |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), React 19 |
| **Styling** | Tailwind CSS 4, Lucide Icons, Motion (Framer Motion) |
| **Data Fetching** | SWR (Stale-While-Revalidate) |
| **Charts** | Chart.js, React-Chartjs-2, Recharts |
| **Backend API** | Next.js Serverless Functions |
| **Database** | Supabase (PostgreSQL), Prisma ORM |
| **Real-time** | Node.js WebSocket (ws) |

---

## 🚀 Panduan Instalasi

### 1. Kloning & Install
```bash
git clone https://github.com/tiyosptr/dashboard-TA-.git
cd dashboard-TA-
npm install
```

### 2. Environment Variables (.env)
Siapkan file `.env` dengan variabel berikut:
```env
# Database Connections
DATABASE_URL="postgresql://user:pass@host:port/db?schema=public"
DIRECT_URL="postgresql://user:pass@host:port/db?schema=public"

# Supabase Auth/Access
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" # Dibutuhkan untuk server-side admin
```

### 3. Setup Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Running the App
Anda harus menjalankan dua proses:
- **Web App**: `npm run dev` (Port 3000)
- **WS Server**: `node server-ws.mjs` (Port 3001)

---

## 📡 Dokumentasi API

### 1. Dashboard Summary
**Endpoint**: `GET /api/dashboard/summary`  
**Query Params**:
- `tab`: `dashboard` | `analysis` | `all`
- `lineId`: ID lini produksi (opsional)
- `pn`: Part Number (opsional)

**Response Preview**:
```json
{
  "success": true,
  "actualOutput": { "hourly": [...], "summary": {...} },
  "oee": { "availability": 85, "performance": 90, "quality": 100, "oee": 76.5 },
  "throughput": { "latest": {...}, "history": [...] },
  "cycleTimeLine": { "actual_cycle_time": 35.12, "total_output": 41, ... }
}
```

### 2. Machine Dashboard
**Endpoint**: `GET /api/management-system/[id]/dashboard`  
Mengambil semua data matriks (OEE, Output, dll) khusus untuk satu mesin tertentu.

---

## 🔄 Arsitektur Real-time (WebSocket)
Aplikasi menggunakan WebSocket server mandiri (`server-ws.mjs`) yang mendengarkan event dari database atau trigger API.

**Event Types**:
- `MACHINE_STATUS_UPDATE`: Dikirim saat status mesin berubah (Active -> Downtime).
- `LINE_THROUGHPUT_UPDATE`: Dikirim saat ada kalkulasi throughput baru.
- `DATA_UPDATE`: Event umum untuk memicu re-fetch pada dashboard klien.

**Client Integration**:
Klien menggunakan `useEffect` pada level dashboard untuk listen ke port 3001 dan memicu `mutate()` dari SWR saat menerima pesan.

---

## 🗄️ Skema Database (E-R Highlights)
- **Line**: Representasi lini produksi.
- **Machine**: Inventaris mesin fisik dengan status dan runtime.
- **Line_Process**: Tabel *junction* yang memetakan mesin ke urutan proses pada suatu lini.
- **Actual_Output**: Pencatatan output produksi (Pass/Reject).
- **Machine_Status_Log**: Rekam jejak perubahan status mesin untuk kalkulasi Downtime.
- **Throughput_Line / Cycle_Time_History**: Tabel penyimpan hasil kalkulasi metrik industri.

---

## 📂 Struktur Folder
- `/app/api`: Router untuk endpoint RESTful.
- `/services/calculation`: Inti dari algoritma kalkulasi industri (ΔQ/Δt, CT, dll).
- `/components/charts`: Koleksi visualisasi menggunakan Chart.js yang dioptimalkan untuk performa.
- `/prisma/schema.prisma`: Sumber kebenaran skema database.

---

## 🛠️ Maintenance & Troubleshooting
- **Data Tidak Update?** Pastikan server WebSocket (`node server-ws.mjs`) berjalan di background.
- **Prisma Error?** Jalankan `npx prisma generate` ulang setelah mengganti schema.
- **Vercel Deployment**: Pastikan environment variables sudah di-*copy* ke Vercel dashboard.

---

**Produk ini dikembangkan untuk standarisasi monitoring Industri 4.0.**
*Developed by Tiyosptr*
