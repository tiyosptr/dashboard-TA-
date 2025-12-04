# Prisma + Supabase Setup Guide

## 📋 Overview

Setup lengkap untuk menggunakan Prisma ORM dengan Supabase PostgreSQL database. Mendukung:
- ✅ Server-Side Rendering (SSR) di Next.js
- ✅ Client-Side Rendering (CSR) melalui API Routes
- ✅ Supabase PostgreSQL Database
- ✅ Migration & Seeding

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

Dependencies yang sudah ditambahkan:
- `@prisma/client` - Prisma Client untuk query database
- `prisma` - Prisma CLI untuk migrations
- `tsx` - TypeScript executor untuk seeding

### 2. Setup Environment Variables

Buat file `.env.local` di root project dan isi dengan:

```env
# Supabase Database URLs
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"
```

**Cara mendapatkan connection string dari Supabase:**
1. Buka project Supabase Anda
2. Pergi ke **Settings** → **Database**
3. Scroll ke **Connection String** → **URI**
4. Copy connection string dan ganti `[YOUR-PASSWORD]` dengan password database Anda

**Perbedaan DATABASE_URL dan DIRECT_URL:**
- `DATABASE_URL` (port 6543): Untuk connection pooling (digunakan di production)
- `DIRECT_URL` (port 5432): Untuk direct connection (digunakan untuk migrations)

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

Command ini akan:
- Generate Prisma Client berdasarkan schema
- Membuat TypeScript types untuk semua models

### 4. Push Schema ke Database (Recommended untuk Supabase)

```bash
npm run prisma:push
```

Command ini akan:
- Sync schema Prisma dengan database Supabase Anda
- Membuat semua tables, indexes, dan constraints
- **Tidak membuat migration files** (cocok untuk Supabase yang sudah ada schema)

**ATAU** jika Anda ingin menggunakan migrations:

```bash
npm run prisma:migrate
```

---

## 📁 File Structure

```
my-app/
├── prisma/
│   ├── schema.prisma          # Prisma schema definition
│   └── seed.ts                # (Optional) Database seeding
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   └── db-helpers.ts          # Helper functions untuk SSR & CSR
├── app/
│   └── api/
│       ├── actual-output/
│       │   └── route.ts       # API routes untuk Actual Output
│       ├── data-items/
│       │   └── route.ts       # API routes untuk Data Items
│       ├── machines/
│       │   └── route.ts       # API routes untuk Machines
│       └── work-orders/
│           └── route.ts       # API routes untuk Work Orders
└── .env.local                 # Environment variables (create this)
```

---

## 💻 Usage Examples

### Server-Side Rendering (SSR)

Gunakan di Server Components atau Server Actions:

```typescript
// app/dashboard/page.tsx
import { actualOutputDb, machinesDb } from '@/lib/db-helpers'

export default async function DashboardPage() {
  // Fetch data directly from database
  const actualOutputs = await actualOutputDb.getAll({
    date: new Date(),
  })
  
  const machines = await machinesDb.getAll({
    status: 'running',
  })

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Render your data */}
    </div>
  )
}
```

### Client-Side Rendering (CSR)

Gunakan di Client Components:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { actualOutputApi, machinesApi } from '@/lib/db-helpers'

export default function DashboardClient() {
  const [actualOutputs, setActualOutputs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await actualOutputApi.getAll({
          lineId: 'some-line-id',
        })
        setActualOutputs(data)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {/* Render your data */}
    </div>
  )
}
```

### Create Data (Client-Side)

```typescript
'use client'

import { actualOutputApi } from '@/lib/db-helpers'

async function handleSubmit(formData: any) {
  try {
    const newOutput = await actualOutputApi.create({
      lineId: formData.lineId,
      shiftNumber: formData.shiftNumber,
      hourSlot: formData.hourSlot,
      output: formData.output,
      reject: formData.reject,
      targetOutput: formData.targetOutput,
      pn: formData.pn,
    })
    
    console.log('Created:', newOutput)
  } catch (error) {
    console.error('Error creating:', error)
  }
}
```

### Update Data (Client-Side)

```typescript
'use client'

import { machinesApi } from '@/lib/db-helpers'

async function updateMachineStatus(machineId: string, status: string) {
  try {
    const updated = await machinesApi.update({
      id: machineId,
      status: status,
    })
    
    console.log('Updated:', updated)
  } catch (error) {
    console.error('Error updating:', error)
  }
}
```

---

## 🗄️ Available Models & Functions

### 1. ActualOutput
```typescript
// Server-side
import { actualOutputDb } from '@/lib/db-helpers'

await actualOutputDb.getAll(filters?)
await actualOutputDb.getById(id)
await actualOutputDb.create(data)
await actualOutputDb.update(id, data)
await actualOutputDb.delete(id)
await actualOutputDb.getByLineAndDate(lineId, date)
await actualOutputDb.getSummary(filters?)

// Client-side
import { actualOutputApi } from '@/lib/db-helpers'

await actualOutputApi.getAll(filters?)
await actualOutputApi.create(data)
await actualOutputApi.update(data)
await actualOutputApi.delete(id)
```

### 2. DataItems
```typescript
// Server-side
import { dataItemsDb } from '@/lib/db-helpers'

await dataItemsDb.getAll(filters?)
await dataItemsDb.getBySn(sn)
await dataItemsDb.create(data)
await dataItemsDb.update(sn, data)
await dataItemsDb.delete(sn)
await dataItemsDb.getByPn(pn)
await dataItemsDb.getStatistics(filters?)

// Client-side
import { dataItemsApi } from '@/lib/db-helpers'

await dataItemsApi.getAll(filters?)
await dataItemsApi.create(data)
await dataItemsApi.update(data)
await dataItemsApi.delete(sn)
```

### 3. Machines
```typescript
// Server-side
import { machinesDb } from '@/lib/db-helpers'

await machinesDb.getAll(filters?)
await machinesDb.getById(id)
await machinesDb.create(data)
await machinesDb.update(id, data)
await machinesDb.delete(id)
await machinesDb.getNeedingMaintenance()

// Client-side
import { machinesApi } from '@/lib/db-helpers'

await machinesApi.getAll(filters?)
await machinesApi.create(data)
await machinesApi.update(data)
await machinesApi.delete(id)
```

### 4. WorkOrders
```typescript
// Server-side
import { workOrdersDb } from '@/lib/db-helpers'

await workOrdersDb.getAll(filters?)
await workOrdersDb.getById(id)
await workOrdersDb.create(data)
await workOrdersDb.update(id, data)
await workOrdersDb.delete(id)
await workOrdersDb.getPending()

// Client-side
import { workOrdersApi } from '@/lib/db-helpers'

await workOrdersApi.getAll(filters?)
await workOrdersApi.create(data)
await workOrdersApi.update(data)
await workOrdersApi.delete(id)
```

### 5. Notifications
```typescript
// Server-side only
import { notificationsDb } from '@/lib/db-helpers'

await notificationsDb.getAll(filters?)
await notificationsDb.getById(id)
await notificationsDb.create(data)
await notificationsDb.update(id, data)
await notificationsDb.markAsRead(id)
await notificationsDb.acknowledge(id, acknowledgedBy)
await notificationsDb.getUnread()
```

### 6. Lines
```typescript
// Server-side only
import { linesDb } from '@/lib/db-helpers'

await linesDb.getAll()
await linesDb.getById(id)
await linesDb.create(data)
await linesDb.update(id, data)
await linesDb.delete(id)
```

### 7. Processes
```typescript
// Server-side only
import { processesDb } from '@/lib/db-helpers'

await processesDb.getAll(filters?)
await processesDb.getById(id)
await processesDb.create(data)
await processesDb.update(id, data)
await processesDb.delete(id)
```

### 8. Technicians
```typescript
// Server-side only
import { techniciansDb } from '@/lib/db-helpers'

await techniciansDb.getAll(filters?)
await techniciansDb.getById(id)
await techniciansDb.create(data)
await techniciansDb.update(id, data)
await techniciansDb.delete(id)
await techniciansDb.getActive()
```

---

## 🔧 Useful Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database (no migration files)
npm run prisma:push

# Create and run migrations
npm run prisma:migrate

# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Run seed script (if you create one)
npm run prisma:seed
```

---

## 🔄 Migration from SQL to Prisma

Karena Anda sudah memiliki database yang ada di Supabase, gunakan **`prisma db push`** daripada migrations:

```bash
npm run prisma:push
```

Ini akan:
1. ✅ Membaca schema dari `prisma/schema.prisma`
2. ✅ Membandingkan dengan database Supabase Anda
3. ✅ Membuat/update tables sesuai dengan schema
4. ✅ Tidak membuat migration files

**Catatan:** Jika Anda ingin menggunakan migration system, gunakan:

```bash
# Create initial migration from existing database
npx prisma migrate dev --name init

# Or pull schema from existing database
npx prisma db pull
```

---

## 🎯 Best Practices

### 1. Server vs Client Components

**Gunakan Server Components (SSR) ketika:**
- Data tidak perlu real-time updates
- Ingin SEO optimization
- Mengurangi bundle size client
- Data sensitif yang tidak boleh exposed ke client

**Gunakan Client Components (CSR) ketika:**
- Butuh interactivity (forms, buttons, etc)
- Real-time updates
- User-specific data yang sering berubah

### 2. Error Handling

Selalu wrap database calls dengan try-catch:

```typescript
try {
  const data = await actualOutputDb.getAll()
  return data
} catch (error) {
  console.error('Database error:', error)
  throw new Error('Failed to fetch data')
}
```

### 3. Type Safety

Prisma memberikan full TypeScript support:

```typescript
import { Prisma } from '@prisma/client'

// Use Prisma types
type ActualOutputWithRelations = Prisma.ActualOutputGetPayload<{
  include: { /* your relations */ }
}>
```

### 4. Connection Pooling

Prisma Client singleton (`lib/prisma.ts`) mencegah multiple connections di development.

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"

**Solusi:**
1. Cek `.env.local` sudah benar
2. Pastikan IP Anda di-whitelist di Supabase (Settings → Database → Connection Pooling)
3. Test connection: `npx prisma db push`

### Error: "Environment variable not found: DATABASE_URL"

**Solusi:**
1. Pastikan file `.env.local` ada di root project
2. Restart development server: `npm run dev`

### Error: "Prisma Client not generated"

**Solusi:**
```bash
npm run prisma:generate
```

### BigInt Serialization Error

Jika mendapat error saat serialize BigInt:

```typescript
// Add this to your API route
JSON.stringify(data, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
)
```

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js with Prisma](https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices)

---

## ✅ Checklist

- [ ] Install dependencies: `npm install`
- [ ] Create `.env.local` with database URLs
- [ ] Generate Prisma Client: `npm run prisma:generate`
- [ ] Push schema to database: `npm run prisma:push`
- [ ] Test connection: `npm run prisma:studio`
- [ ] Start development: `npm run dev`

---

**Selamat! Setup Prisma + Supabase Anda sudah siap digunakan! 🎉**
