# Dokumentasi Metrik Perhitungan Dashboard Line Produksi

Dokumen ini menjelaskan rancangan arsitektur, parameter, dan rumus kalkulasi metrik utama produksi yang digunakan dalam sistem Dashboard (Khususnya OEE, Throughput, dan Cycle Time). Seluruh pengambilan data bersifat *real-time* dan terpusat dari pergerakan data di tabel mentah `data_items`.

---

## 1. Parameter dan Waktu Dasar
Sistem menggunakan deteksi **Shift Aktif** untuk menetapkan jendela waktu bagi seluruh perhitungan metrik di lini dengan langkah-langkah:
- Mendeteksi ID shift yang dipilih oleh _user_ (frontend) **atau** secara otomatis membaca jam UTC/WIB saat ini jika tidak ada yang dipilih.
- Membuat dua *point-in-time* absolut: `shift_start_ts` dan `shift_end_ts`.

**Waktu Dasar yang Dikalkulasi:**
* **Total Shift Seconds**: Total durasi mentah shift yang aktif (Misal 07:00 - 15:00 = 8 Jam = 28800 detik).
* **Planned Downtime**: Total waktu jeda terencana seperti jeda jadwal maintenance harian dan waktu _Break_ pegawai.
* **Unplanned Downtime**: Total durasi error dari tabel `machine_status_log` di mana mesin beralih ke status gangguan di luar rencana selama durasi _shift_ yang sedang berjalan.

### Rumus Waktu:
> **Planned Production Time** = Total Shift Seconds − Planned Downtime
> 
> **Operating Time (Sec)** = Planned Production Time − Unplanned Downtime

---

## 2. Overall Equipment Effectiveness (OEE) Lini

Metrik Total OEE divalidasi dari stasiun kerja paling ujung di sebuah lini (End-of-Line), yaitu **Mesin VIFG**.

### A. Availability Rate
Mencari rasio waktu produksi secara langsung (*mesin menyala*) dibandingkan dengan waktu jadwal resmi yang direncanakan.

> **Rumus:** `Operating Time / Planned Production Time`
> **Implementasi Kode:** `Availability % = (Operating Time / Planned) × 100`

### B. Performance Rate
Mencari keefektifan percepatan produksi lini dengan membandingkan aktual hasil VIFG dengan target matematis idealnya. Modul mem-filter baris tabel waktu, lalu memotong `operating_time` menjadi ukuran satuan jam.

> **Target Ideal** = `(Operating Time Seconds / 3600) × Target Produksi Per Jam` *(Secara _default constraint_ diatur 100 Unit/Jam)*
> 
> **Total Aktual (VIFG)** = `COUNT()` seluruh status (Pass & Reject) di tabel `data_items` untuk `line_process_id = VIFG` dalam rentang jendela waktu Shift Aktif.
>
> **Rumus:** `Total Aktual (VIFG) / Target Ideal`
> **Implementasi Kode:** `Performance % = (Total Aktual / Target Ideal) × 100`

### C. Quality Rate
Mengukur tingkat kesempurnaan produk yang tidak memakan biaya perbaikan/tolak ulang. Menarik langsung rekaman dari data mentah scanner `data_items`.

> **Total Pass** = Jumlah _data_items_ berstatus `Pass` di VIFG rentang Shift.
> **Total Reject** = Jumlah _data_items_ berstatus `Reject` di VIFG rentang Shift.
>
> **Rumus:** `Total Pass / (Total Pass + Total Reject)`
> **Implementasi Kode:** `Quality % = (Pass / (Pass + Reject)) × 100`

### D. Final OEE
Kalkulasi gabungan dari tiga faktor utama.

> **Rumus OEE Final:** `Availability % × Performance % × Quality %`
> **Implementasi Kode:** `(Availability_Pct * Performance_Pct * Quality_Pct) / 10000`

---

## 3. Lini Throughput
Melaporkan efektivitas dari proses yang berlangsung secara berjalan (*Real-Time Speed*). Berbeda dengan *Performance*, metrik ini hanya mengambil barang berhasil (Pass) untuk disetarakan dengan kecepatan laju per detik dari pergerakan waktu *Elapsed* (Waktu yang saat ini persis telah berlalu sejak awal _Shift_).

> **Elapsed Hours** = Waktu (detik) dari mulainya Shift hingga jam real-time saat modul dijalankan / `3600`.
> **Total Pass (VIFG)** = Murni produk berstatus `pass` saja.
> 
> **Rumus Throughput:** `Total Pass (VIFG) / Elapsed Hours`
> **Implementasi Kode (Dibulatkan Penuh):** `Math.round(Total Pass / Elapsed Hours)` Unit per Jam.

---

## 4. Lini Cycle Time (Waktu Siklus)
Menghitung kecepatan lini mengolah satu buah persatuan produk (*detik per unit*).

> **Total Aktual VIFG** = Total produk (Pass + Reject) dari tabel `data_items`.
> 
> **Rumus:** `Operating Time (detik) / Total Aktual VIFG`
> **Aturan:** 
> - Jika output masih `0`, Cycle Time otomatis akan diset mengembalikan rentang jendela `Operating Time` secara mendatar sehingga tidak terjadi _Error divided by zero_.

---

## Ringkasan Catatan Teknis (Data Flow)
1. Seluruh _trigger_ dan *summation* untuk perhitungan di panel **Lini** diarahkan mutlak pada _process\_order_ tertinggi di database, khususnya yang bereferensi nama mesin **VIFG** di master `line_process`.
2. Pengambilan aktual tidak lagi bergantung kepada log riwayat ringkasan seperti `defect_by_process` perbaikan tempo hari sengaja ditujukan agar sistem mendeteksi mentahan asli `data_items` sehingga akurasi data tidak akan pernah telat (_delay_) sepersekian detik pun akibat _cron_ maupun kegagalan penulisan _Trigger UPSERT_ lokal.
