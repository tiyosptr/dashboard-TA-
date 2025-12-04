# Architecture Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js Application                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────┐                          ┌───────────────┐
│  Server Side  │                          │  Client Side  │
│  (SSR/RSC)    │                          │  (CSR)        │
└───────────────┘                          └───────────────┘
        │                                           │
        │                                           │
        ▼                                           ▼
┌───────────────┐                          ┌───────────────┐
│ db-helpers.ts │                          │ db-helpers.ts │
│ (Server Fns)  │                          │ (Client Fns)  │
│               │                          │               │
│ actualOutputDb│                          │ actualOutputApi│
│ machinesDb    │                          │ machinesApi   │
│ workOrdersDb  │                          │ workOrdersApi │
└───────────────┘                          └───────────────┘
        │                                           │
        │                                           │
        ▼                                           ▼
┌───────────────┐                          ┌───────────────┐
│  Prisma ORM   │                          │  API Routes   │
│  (Direct)     │                          │  /api/*       │
└───────────────┘                          └───────────────┘
        │                                           │
        │                                           │
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  Prisma Client    │
                    │  (lib/prisma.ts)  │
                    └───────────────────┘
                              │
                              │
                              ▼
                    ┌───────────────────┐
                    │  Connection Pool  │
                    │  (PgBouncer)      │
                    └───────────────────┘
                              │
                              │
                              ▼
                    ┌───────────────────┐
                    │  Supabase         │
                    │  PostgreSQL       │
                    │  Database         │
                    └───────────────────┘
```

---

## 📊 Data Flow

### Server-Side Rendering (SSR)

```
User Request
    │
    ▼
Next.js Server Component
    │
    ▼
db-helpers.ts (actualOutputDb.getAll())
    │
    ▼
Prisma Client (prisma.actualOutput.findMany())
    │
    ▼
PostgreSQL Query
    │
    ▼
Supabase Database
    │
    ▼
Return Data
    │
    ▼
Render HTML
    │
    ▼
Send to Client
```

### Client-Side Rendering (CSR)

```
User Action (Button Click)
    │
    ▼
Client Component
    │
    ▼
db-helpers.ts (actualOutputApi.create())
    │
    ▼
fetch('/api/actual-output', { method: 'POST' })
    │
    ▼
API Route Handler
    │
    ▼
Prisma Client (prisma.actualOutput.create())
    │
    ▼
PostgreSQL Query
    │
    ▼
Supabase Database
    │
    ▼
Return JSON
    │
    ▼
Update UI State
```

---

## 🗂️ File Structure & Responsibilities

```
my-app/
│
├── prisma/
│   ├── schema.prisma          → Database schema definition
│   └── seed.ts                → Sample data generator
│
├── lib/
│   ├── prisma.ts              → Prisma client singleton
│   │                            (Prevents multiple connections)
│   │
│   └── db-helpers.ts          → Helper functions
│                                • Server functions (xxxDb)
│                                • Client functions (xxxApi)
│
├── app/
│   ├── api/
│   │   ├── actual-output/
│   │   │   └── route.ts       → REST API for ActualOutput
│   │   │                        GET, POST, PUT, DELETE
│   │   │
│   │   ├── data-items/
│   │   │   └── route.ts       → REST API for DataItems
│   │   │
│   │   ├── machines/
│   │   │   └── route.ts       → REST API for Machines
│   │   │
│   │   └── work-orders/
│   │       └── route.ts       → REST API for WorkOrders
│   │
│   ├── example-server/
│   │   └── page.tsx           → SSR example (Server Component)
│   │
│   └── example-client/
│       └── page.tsx           → CSR example (Client Component)
│
└── .env.local                 → Environment variables
                                 • DATABASE_URL
                                 • DIRECT_URL
```

---

## 🔄 Database Models & Relations

```
┌─────────────┐
│    Line     │
└─────────────┘
       │
       │ 1:N
       │
       ▼
┌─────────────┐         ┌─────────────┐
│  Machine    │────────▶│WorkOrder    │
└─────────────┘   1:N   └─────────────┘
       │                       │
       │ 1:N                   │ 1:N
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│Notification │         │    Task     │
└─────────────┘         └─────────────┘
                              │
                              │ 1:N
                              │
                              ▼
                        ┌─────────────┐
                        │    Note     │
                        └─────────────┘

┌─────────────┐
│ActualOutput │  (Independent)
└─────────────┘

┌─────────────┐
│ DataItems   │  (Independent)
└─────────────┘

┌─────────────┐
│  Process    │  (Independent)
└─────────────┘

┌─────────────┐
│ Technician  │  (Independent)
└─────────────┘
```

---

## 🎯 Usage Patterns

### Pattern 1: Simple Read (SSR)

```typescript
// app/dashboard/page.tsx
import { machinesDb } from '@/lib/db-helpers'

export default async function Dashboard() {
  const machines = await machinesDb.getAll()
  return <div>{/* render */}</div>
}
```

**Flow:**
```
Page Request → Server Component → machinesDb.getAll() 
→ Prisma Query → Database → Return Data → Render HTML
```

---

### Pattern 2: Interactive CRUD (CSR)

```typescript
// app/machines/page.tsx
'use client'
import { machinesApi } from '@/lib/db-helpers'

export default function Machines() {
  const handleCreate = async () => {
    await machinesApi.create({ /* data */ })
  }
  return <button onClick={handleCreate}>Create</button>
}
```

**Flow:**
```
Button Click → machinesApi.create() → fetch('/api/machines') 
→ API Route → Prisma Query → Database → Return JSON → Update UI
```

---

### Pattern 3: Hybrid (SSR + Realtime)

```typescript
'use client'
import { machinesApi } from '@/lib/db-helpers'
import { createClient } from '@/lib/supabase/client'

export default function RealtimeMachines() {
  // Initial fetch with Prisma
  useEffect(() => {
    machinesApi.getAll().then(setMachines)
  }, [])
  
  // Subscribe to changes with Supabase
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('machines')
      .on('postgres_changes', { /* config */ }, (payload) => {
        // Refresh data
        machinesApi.getAll().then(setMachines)
      })
      .subscribe()
    
    return () => supabase.removeChannel(channel)
  }, [])
}
```

**Flow:**
```
Initial: Page Load → machinesApi.getAll() → API → Prisma → Database
Realtime: Database Change → Supabase Realtime → Client → Refresh Data
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────┐
│         Client Browser                   │
│  • Can only access /api/* endpoints      │
│  • No direct database access             │
└─────────────────────────────────────────┘
                  │
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────┐
│         Next.js Server                   │
│  • API Routes (public)                   │
│  • Server Components (private)           │
│  • Environment variables (private)       │
└─────────────────────────────────────────┘
                  │
                  │ Prisma Client
                  ▼
┌─────────────────────────────────────────┐
│         Prisma ORM                       │
│  • Parameterized queries                 │
│  • SQL injection protection              │
│  • Type validation                       │
└─────────────────────────────────────────┘
                  │
                  │ PostgreSQL Protocol
                  ▼
┌─────────────────────────────────────────┐
│         Supabase Database                │
│  • Connection pooling                    │
│  • SSL encryption                        │
│  • Row Level Security (optional)         │
└─────────────────────────────────────────┘
```

---

## 📈 Performance Optimization

### Connection Pooling

```
Multiple Requests
    │
    ├─ Request 1 ─┐
    ├─ Request 2 ─┤
    ├─ Request 3 ─┼─→ Connection Pool (PgBouncer)
    ├─ Request 4 ─┤      │
    └─ Request 5 ─┘      │
                         ▼
                   Database Connections
                   (Limited, Reused)
```

### Caching Strategy

```
Request → Check Cache → Cache Hit? 
                           │
                    Yes ───┴─── No
                     │           │
                     ▼           ▼
                Return Cache  Query DB
                               │
                               ▼
                          Update Cache
                               │
                               ▼
                          Return Data
```

---

## 🎯 Decision Tree: When to Use What?

```
Need to fetch data?
    │
    ├─ Server Component? ──→ Use xxxDb functions
    │                        (Direct Prisma)
    │
    └─ Client Component? ──→ Use xxxApi functions
                             (Via API routes)

Need realtime updates?
    │
    └─ Use Supabase Realtime
       + Prisma for queries

Need authentication?
    │
    └─ Use Supabase Auth
       + Prisma for data

Need file upload?
    │
    └─ Use Supabase Storage
       + Prisma for metadata
```

---

## 📊 Comparison Table

| Feature | Prisma (Server) | Prisma (Client) | Supabase Client |
|---------|----------------|-----------------|-----------------|
| Type Safety | ✅ Full | ✅ Full | ⚠️ Partial |
| Performance | ✅ Best | ✅ Good | ✅ Good |
| Realtime | ❌ No | ❌ No | ✅ Yes |
| Auth | ❌ No | ❌ No | ✅ Yes |
| Storage | ❌ No | ❌ No | ✅ Yes |
| RLS | ⚠️ Bypass | ⚠️ Bypass | ✅ Respect |
| Use Case | SSR, Server Actions | Interactive UI | Realtime, Auth |

---

**Recommendation:** Use Prisma untuk queries, Supabase untuk realtime & auth! 🎯
