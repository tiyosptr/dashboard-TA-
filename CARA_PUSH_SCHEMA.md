# 🚀 Cara Push Prisma Schema ke Supabase

## Langkah-Langkah Setup

### 1. Setup Environment Variables

Buat file `.env.local` di root project dengan isi:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

**Cara mendapatkan credentials:**
1. Login ke https://app.supabase.com
2. Pilih project Anda (database: **dashboard(TA)**)
3. Pergi ke **Settings** → **Database**
4. Scroll ke **Connection String** section
5. Pilih tab **URI**
6. Copy connection string
7. Ganti `[YOUR-PASSWORD]` dengan database password Anda
8. Ganti `[YOUR-PROJECT-REF]` dengan project reference Anda (contoh: `abcdefghijk`)

**Contoh:**
```env
DATABASE_URL="postgresql://postgres:mySecretPassword@abcdefghijk.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:mySecretPassword@abcdefghijk.supabase.co:5432/postgres"
```

---

### 2. Generate Prisma Client

Setelah `.env.local` dibuat, jalankan:

```bash
npm run prisma:generate
```

Atau:

```bash
npx prisma generate
```

**Output yang diharapkan:**
```
✔ Generated Prisma Client (v6.x.x) to ./node_modules/@prisma/client
```

---

### 3. Push Schema ke Database

Jalankan command berikut untuk sync schema ke Supabase:

```bash
npm run prisma:push
```

Atau:

```bash
npx prisma db push
```

**Apa yang terjadi:**
- ✅ Prisma akan membaca `prisma/schema.prisma`
- ✅ Membandingkan dengan database Supabase Anda
- ✅ Membuat/update tables yang belum ada
- ✅ Membuat indexes
- ✅ Setup foreign keys dan constraints

**Output yang diharapkan:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

🚀  Your database is now in sync with your Prisma schema.
✔ Generated Prisma Client (v6.x.x) to ./node_modules/@prisma/client
```

---

### 4. Verifikasi di Prisma Studio

Buka Prisma Studio untuk melihat database Anda:

```bash
npm run prisma:studio
```

Atau:

```bash
npx prisma studio
```

Ini akan membuka browser di `http://localhost:5555` dimana Anda bisa:
- ✅ Melihat semua tables
- ✅ Browse data
- ✅ Edit data
- ✅ Verifikasi schema sudah benar

---

### 5. (Optional) Seed Sample Data

Jika Anda ingin menambahkan sample data untuk testing:

```bash
npm run prisma:seed
```

Ini akan menambahkan:
- 2 Lines (Line 1, Line 2)
- 2 Machines (Machine A1, Machine A2)
- 2 Technicians (John Doe, Jane Smith)
- 10 Actual Output records
- 20 Data Items
- 1 Work Order dengan tasks dan notes

---

## ⚠️ Troubleshooting

### Error: "Can't reach database server"

**Solusi:**
1. Cek `.env.local` sudah benar
2. Pastikan password tidak ada karakter special yang perlu di-encode
3. Cek IP Anda di-whitelist di Supabase:
   - Supabase Dashboard → Settings → Database
   - Scroll ke "Connection Pooling"
   - Pastikan "Restrict access to trusted IPs" tidak aktif, atau tambahkan IP Anda

### Error: "Environment variable not found: DATABASE_URL"

**Solusi:**
1. Pastikan file `.env.local` ada di root project
2. Restart terminal/command prompt
3. Restart development server: `npm run dev`

### Error: "SSL connection required"

**Solusi:**
Tambahkan `?sslmode=require` di akhir DATABASE_URL:
```env
DATABASE_URL="postgresql://...?pgbouncer=true&sslmode=require"
```

### Error: "Too many connections"

**Solusi:**
1. Pastikan menggunakan port 6543 (connection pooling)
2. Tutup Prisma Studio jika sedang berjalan
3. Restart development server

---

## 📊 Verifikasi Schema di Supabase

Setelah push berhasil, verifikasi di Supabase Dashboard:

1. Login ke Supabase Dashboard
2. Pilih project Anda
3. Pergi ke **Table Editor**
4. Anda harus melihat 11 tables:
   - ✅ actual_output
   - ✅ data_items
   - ✅ line
   - ✅ machine
   - ✅ work_order
   - ✅ notification
   - ✅ process
   - ✅ task
   - ✅ technician
   - ✅ note

5. Check indexes di **Database** → **Indexes**
6. Check foreign keys di **Database** → **Relationships**

---

## 🎯 Next Steps

Setelah schema berhasil di-push:

1. ✅ **Test Connection**
   ```bash
   npm run prisma:studio
   ```

2. ✅ **Seed Sample Data** (Optional)
   ```bash
   npm run prisma:seed
   ```

3. ✅ **Start Development**
   ```bash
   npm run dev
   ```

4. ✅ **Test API Routes**
   - `/api/actual-output`
   - `/api/data-items`
   - `/api/machines`
   - `/api/work-orders`

5. ✅ **Test Example Pages**
   - `/example-server` - Server-side rendering
   - `/example-client` - Client-side rendering

---

## 📝 Important Notes

### Tentang `prisma db push` vs `prisma migrate`

**`prisma db push`** (Recommended untuk Supabase):
- ✅ Langsung sync schema ke database
- ✅ Tidak membuat migration files
- ✅ Cocok untuk database yang sudah ada
- ✅ Lebih cepat untuk development

**`prisma migrate`**:
- ✅ Membuat migration files
- ✅ Bisa rollback
- ✅ Better untuk production
- ✅ Lebih complex

Untuk project ini, gunakan **`prisma db push`** karena:
1. Database sudah ada di Supabase
2. Schema sudah didefinisikan di SQL
3. Lebih simple dan cepat

---

## ✅ Checklist

- [ ] File `.env.local` sudah dibuat dengan credentials yang benar
- [ ] `npm run prisma:generate` berhasil
- [ ] `npm run prisma:push` berhasil
- [ ] Semua 11 tables terlihat di Supabase Table Editor
- [ ] `npm run prisma:studio` bisa dibuka
- [ ] (Optional) `npm run prisma:seed` berhasil
- [ ] Development server running: `npm run dev`
- [ ] API routes bisa diakses
- [ ] Example pages bisa dibuka

---

**Selamat! Prisma setup Anda sudah complete! 🎉**

Jika ada masalah, check `PRISMA_SETUP.md` untuk troubleshooting lebih detail.
