# 🗄️ Prisma ORM Setup - Dashboard (TA)

Complete Prisma ORM integration untuk database Supabase PostgreSQL dengan support untuk Server-Side Rendering (SSR) dan Client-Side Rendering (CSR).

---

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| **[PRISMA_SUMMARY.md](./PRISMA_SUMMARY.md)** | 📋 Overview lengkap semua yang sudah dibuat |
| **[PRISMA_SETUP.md](./PRISMA_SETUP.md)** | 🚀 Step-by-step setup guide |
| **[PRISMA_QUICK_REF.md](./PRISMA_QUICK_REF.md)** | ⚡ Quick reference untuk daily usage |
| **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** | 🔄 SQL to Prisma migration guide |
| **[SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md)** | 🔗 Supabase integration guide |

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Buat file `.env.local`:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
```

### 3. Generate & Push
```bash
npm run prisma:generate
npm run prisma:push
```

### 4. Start Development
```bash
npm run dev
```

---

## 📁 Project Structure

```
my-app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Sample data seeder
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   └── db-helpers.ts          # Helper functions (SSR & CSR)
├── app/
│   ├── api/
│   │   ├── actual-output/     # API routes
│   │   ├── data-items/
│   │   ├── machines/
│   │   └── work-orders/
│   ├── example-server/        # SSR example
│   └── example-client/        # CSR example
└── Documentation files
```

---

## 🎯 Features

✅ **11 Database Models**
- ActualOutput, DataItems, Line, Machine, WorkOrder
- Notification, Process, Task, Technician, Note

✅ **Full CRUD Operations**
- Server-side functions (direct Prisma)
- Client-side functions (via API routes)

✅ **Type Safety**
- Full TypeScript support
- Auto-completion
- Type-safe queries

✅ **Optimized Performance**
- Connection pooling
- Indexed queries
- Prepared statements

✅ **Supabase Ready**
- Direct integration
- Realtime support
- RLS compatible

---

## 💻 Usage Examples

### Server-Side (SSR)
```typescript
import { machinesDb } from '@/lib/db-helpers'

export default async function Page() {
  const machines = await machinesDb.getAll()
  return <div>{/* render */}</div>
}
```

### Client-Side (CSR)
```typescript
'use client'
import { machinesApi } from '@/lib/db-helpers'

export default function Page() {
  const [data, setData] = useState([])
  useEffect(() => {
    machinesApi.getAll().then(setData)
  }, [])
  return <div>{/* render */}</div>
}
```

---

## 🔧 Available Commands

```bash
npm run prisma:generate    # Generate Prisma Client
npm run prisma:push        # Push schema to database
npm run prisma:migrate     # Create migration
npm run prisma:studio      # Open database GUI
npm run prisma:seed        # Seed sample data
```

---

## 📊 Database Models

| Model | Server Functions | Client API | Description |
|-------|-----------------|------------|-------------|
| ActualOutput | `actualOutputDb.*` | `actualOutputApi.*` | Production output data |
| DataItems | `dataItemsDb.*` | `dataItemsApi.*` | Item tracking |
| Machines | `machinesDb.*` | `machinesApi.*` | Machine management |
| WorkOrders | `workOrdersDb.*` | `workOrdersApi.*` | Work order system |
| Notifications | `notificationsDb.*` | - | Alert system |
| Lines | `linesDb.*` | - | Production lines |
| Processes | `processesDb.*` | - | Process management |
| Technicians | `techniciansDb.*` | - | Technician data |

---

## 🚀 Next Steps

1. **Read Documentation**
   - Start with [PRISMA_SUMMARY.md](./PRISMA_SUMMARY.md)
   - Follow [PRISMA_SETUP.md](./PRISMA_SETUP.md) for setup

2. **Setup Environment**
   - Create `.env.local` with Supabase credentials
   - Run `npm run prisma:generate`
   - Run `npm run prisma:push`

3. **Test Examples**
   - Visit `/example-server` for SSR example
   - Visit `/example-client` for CSR example

4. **Start Building**
   - Use helper functions from `lib/db-helpers.ts`
   - Check [PRISMA_QUICK_REF.md](./PRISMA_QUICK_REF.md) for quick reference

---

## 📖 Learn More

- **Prisma Documentation**: https://www.prisma.io/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Next.js Documentation**: https://nextjs.org/docs

---

## 🐛 Troubleshooting

Jika mengalami masalah:
1. Check [PRISMA_SETUP.md](./PRISMA_SETUP.md) → Troubleshooting section
2. Check [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md) → Troubleshooting section
3. Verify `.env.local` configuration
4. Run `npm run prisma:generate` again

---

## ✅ What's Included

- ✅ Prisma Schema (11 models)
- ✅ Prisma Client Singleton
- ✅ Database Helper Functions (SSR & CSR)
- ✅ API Routes (4 main endpoints)
- ✅ Example Pages (Server & Client)
- ✅ Seed Script
- ✅ Complete Documentation
- ✅ Type Definitions
- ✅ NPM Scripts

---

## 🎊 Ready to Use!

Semua sudah siap! Tinggal:
1. Setup `.env.local`
2. Run `npm run prisma:generate`
3. Run `npm run prisma:push`
4. Start coding! 🚀

---

**Happy Coding! 🎉**

*For detailed information, check the documentation files listed above.*
