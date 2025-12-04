# Supabase Integration Guide

## 🎯 Overview

Setup ini memungkinkan Anda menggunakan **Prisma ORM** dengan **Supabase PostgreSQL** database. Anda bisa:
- ✅ Query database via Prisma (type-safe, optimized)
- ✅ Tetap menggunakan Supabase features (Auth, Storage, Realtime)
- ✅ Combine keduanya untuk best of both worlds

---

## 🔧 Setup Supabase Connection

### 1. Get Database Credentials

1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda (database: **dashboard(TA)**)
3. Pergi ke **Settings** → **Database**
4. Scroll ke **Connection String** section
5. Copy **URI** connection string

### 2. Configure Environment Variables

Buat file `.env.local`:

```env
# Supabase Database URLs
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Supabase Client (Optional - if using Supabase features)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
```

**Important:**
- **DATABASE_URL** (port 6543): Connection pooling untuk production/serverless
- **DIRECT_URL** (port 5432): Direct connection untuk migrations
- Ganti `[YOUR-PASSWORD]` dengan database password Anda
- Ganti `[PROJECT-REF]` dengan project reference Anda

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Sync Schema to Supabase

```bash
npm run prisma:push
```

Ini akan:
- Create/update tables di Supabase
- Create indexes
- Setup foreign keys
- Apply constraints

---

## 🔄 Using Prisma with Supabase

### Scenario 1: Prisma Only (Recommended untuk CRUD)

```typescript
// Server Component
import { machinesDb } from '@/lib/db-helpers'

export default async function MachinesPage() {
  const machines = await machinesDb.getAll()
  
  return (
    <div>
      {machines.map(machine => (
        <div key={machine.id}>{machine.nameMachine}</div>
      ))}
    </div>
  )
}
```

**Pros:**
- ✅ Type-safe queries
- ✅ Better performance
- ✅ Auto-completion
- ✅ Optimized queries

---

### Scenario 2: Supabase Client Only

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function MachinesPage() {
  const [machines, setMachines] = useState([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchMachines() {
      const { data } = await supabase
        .from('machine')
        .select('*')
      setMachines(data || [])
    }
    fetchMachines()
  }, [])

  return (
    <div>
      {machines.map(machine => (
        <div key={machine.id}>{machine.name_machine}</div>
      ))}
    </div>
  )
}
```

**Pros:**
- ✅ Realtime subscriptions
- ✅ Row Level Security (RLS)
- ✅ Built-in auth integration

---

### Scenario 3: Hybrid (Best of Both Worlds)

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { machinesApi } from '@/lib/db-helpers'
import { useEffect, useState } from 'react'

export default function MachinesPage() {
  const [machines, setMachines] = useState([])
  const supabase = createClient()

  // Initial fetch with Prisma (via API)
  useEffect(() => {
    machinesApi.getAll().then(setMachines)
  }, [])

  // Subscribe to realtime updates with Supabase
  useEffect(() => {
    const channel = supabase
      .channel('machines-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'machine',
        },
        (payload) => {
          console.log('Change received!', payload)
          // Refresh data
          machinesApi.getAll().then(setMachines)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div>
      {machines.map(machine => (
        <div key={machine.id}>{machine.nameMachine}</div>
      ))}
    </div>
  )
}
```

**Pros:**
- ✅ Type-safe queries (Prisma)
- ✅ Realtime updates (Supabase)
- ✅ Best performance
- ✅ Best DX (Developer Experience)

---

## 🔐 Row Level Security (RLS)

Jika Anda menggunakan Supabase RLS, ada beberapa hal yang perlu diperhatikan:

### Option 1: Disable RLS for Prisma

Prisma menggunakan service role connection yang bypass RLS. Ini aman karena Prisma hanya digunakan di server-side.

```sql
-- In Supabase SQL Editor
ALTER TABLE machine DISABLE ROW LEVEL SECURITY;
```

### Option 2: Use Service Role Key

Prisma automatically menggunakan database connection yang bypass RLS. Tidak perlu konfigurasi tambahan.

### Option 3: Keep RLS for Supabase Client

```typescript
// Use Prisma for server-side (bypass RLS)
const machines = await machinesDb.getAll()

// Use Supabase client for client-side (respect RLS)
const { data } = await supabase.from('machine').select('*')
```

---

## 📊 Realtime Subscriptions

Combine Prisma queries dengan Supabase Realtime:

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function RealtimeMachines() {
  const [machines, setMachines] = useState([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch via API (Prisma)
    fetch('/api/machines')
      .then(res => res.json())
      .then(setMachines)

    // Subscribe to changes
    const channel = supabase
      .channel('machine-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'machine',
        },
        (payload) => {
          setMachines(prev => [payload.new, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'machine',
        },
        (payload) => {
          setMachines(prev =>
            prev.map(m => m.id === payload.new.id ? payload.new : m)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'machine',
        },
        (payload) => {
          setMachines(prev =>
            prev.filter(m => m.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div>
      {machines.map(machine => (
        <div key={machine.id}>{machine.name_machine}</div>
      ))}
    </div>
  )
}
```

---

## 🚀 Deployment to Vercel/Production

### 1. Environment Variables

Add ke Vercel/Production environment:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
```

### 2. Build Configuration

Prisma Client akan auto-generated saat build. Tidak perlu konfigurasi tambahan.

### 3. Connection Pooling

Supabase sudah include connection pooling (PgBouncer) di port 6543. Ini optimal untuk serverless functions.

---

## 📈 Performance Optimization

### 1. Use Connection Pooling

Sudah enabled by default dengan `DATABASE_URL` port 6543.

### 2. Index Optimization

Semua indexes dari SQL schema sudah ada di Prisma schema:

```prisma
@@index([pn], name: "idx_actual_output_pn")
@@index([lineId, shiftNumber, date], name: "idx_actual_output_line_shift")
```

### 3. Query Optimization

```typescript
// ✅ Good - Select only needed fields
const machines = await prisma.machine.findMany({
  select: {
    id: true,
    nameMachine: true,
    status: true,
  },
})

// ❌ Bad - Fetch all fields + relations
const machines = await prisma.machine.findMany({
  include: {
    notifications: true,
    workOrders: {
      include: {
        tasks: true,
        notes: true,
      },
    },
  },
})
```

### 4. Caching

```typescript
import { unstable_cache } from 'next/cache'

const getMachines = unstable_cache(
  async () => {
    return await machinesDb.getAll()
  },
  ['machines'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['machines'],
  }
)
```

---

## 🔍 Monitoring & Debugging

### 1. Prisma Studio

```bash
npm run prisma:studio
```

Browse dan edit data di browser.

### 2. Supabase Dashboard

- **Table Editor**: View/edit data
- **SQL Editor**: Run custom queries
- **Database**: Monitor performance
- **Logs**: View query logs

### 3. Query Logging

Enable di development:

```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})
```

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"

**Solutions:**
1. Check `.env.local` exists
2. Verify Supabase credentials
3. Check IP whitelist di Supabase (Settings → Database → Connection Pooling)
4. Try direct connection (port 5432)

### Error: "Too many connections"

**Solutions:**
1. Use connection pooling (port 6543)
2. Check Prisma Client singleton (`lib/prisma.ts`)
3. Reduce concurrent connections

### Error: "SSL connection required"

Add to DATABASE_URL:
```
?sslmode=require
```

### Slow Queries

**Solutions:**
1. Check indexes are created
2. Use `select` instead of fetching all fields
3. Avoid N+1 queries (use `include`)
4. Monitor in Supabase Dashboard

---

## 📋 Checklist

- [ ] Get Supabase credentials
- [ ] Create `.env.local` with DATABASE_URL and DIRECT_URL
- [ ] Run `npm run prisma:generate`
- [ ] Run `npm run prisma:push`
- [ ] Test connection with `npm run prisma:studio`
- [ ] Verify all tables exist in Supabase
- [ ] Test CRUD operations
- [ ] (Optional) Setup Realtime subscriptions
- [ ] (Optional) Configure RLS
- [ ] Deploy to production

---

## 🎯 Recommendations

### When to use Prisma:
- ✅ CRUD operations
- ✅ Complex queries
- ✅ Server-side rendering
- ✅ Type-safe queries
- ✅ Migrations

### When to use Supabase Client:
- ✅ Realtime subscriptions
- ✅ Row Level Security
- ✅ Auth integration
- ✅ Storage operations
- ✅ Edge Functions

### Best Practice:
**Use both!** Prisma untuk queries, Supabase untuk realtime & auth.

---

## 📚 Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma + Supabase Guide](https://www.prisma.io/docs/guides/database/supabase)
- [Next.js + Prisma](https://www.prisma.io/nextjs)

---

**Setup Complete! 🎉**

Anda sekarang bisa menggunakan Prisma dengan Supabase database Anda!
