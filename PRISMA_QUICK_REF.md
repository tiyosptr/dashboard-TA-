# Prisma Quick Reference

## 🚀 Setup Commands

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Push schema to Supabase (recommended)
npm run prisma:push

# Open Prisma Studio
npm run prisma:studio

# Seed database
npm run prisma:seed
```

---

## 📝 Environment Variables

Create `.env.local`:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
```

---

## 💻 Usage

### Server-Side (SSR)

```typescript
import { actualOutputDb } from '@/lib/db-helpers'

export default async function Page() {
  const data = await actualOutputDb.getAll()
  return <div>{/* render data */}</div>
}
```

### Client-Side (CSR)

```typescript
'use client'
import { actualOutputApi } from '@/lib/db-helpers'

export default function Page() {
  const [data, setData] = useState([])
  
  useEffect(() => {
    actualOutputApi.getAll().then(setData)
  }, [])
  
  return <div>{/* render data */}</div>
}
```

---

## 🗄️ Available Functions

### ActualOutput
- `actualOutputDb.getAll(filters?)` - Server
- `actualOutputDb.getById(id)` - Server
- `actualOutputDb.create(data)` - Server
- `actualOutputDb.update(id, data)` - Server
- `actualOutputDb.delete(id)` - Server
- `actualOutputApi.getAll(filters?)` - Client
- `actualOutputApi.create(data)` - Client
- `actualOutputApi.update(data)` - Client
- `actualOutputApi.delete(id)` - Client

### DataItems
- `dataItemsDb.getAll(filters?)` - Server
- `dataItemsDb.getBySn(sn)` - Server
- `dataItemsDb.getByPn(pn)` - Server
- `dataItemsDb.getStatistics(filters?)` - Server
- `dataItemsApi.*` - Client versions

### Machines
- `machinesDb.getAll(filters?)` - Server
- `machinesDb.getById(id)` - Server
- `machinesDb.getNeedingMaintenance()` - Server
- `machinesApi.*` - Client versions

### WorkOrders
- `workOrdersDb.getAll(filters?)` - Server
- `workOrdersDb.getById(id)` - Server
- `workOrdersDb.getPending()` - Server
- `workOrdersApi.*` - Client versions

### Notifications
- `notificationsDb.getAll(filters?)` - Server only
- `notificationsDb.getUnread()` - Server only
- `notificationsDb.markAsRead(id)` - Server only
- `notificationsDb.acknowledge(id, by)` - Server only

### Lines, Processes, Technicians
- `linesDb.*` - Server only
- `processesDb.*` - Server only
- `techniciansDb.*` - Server only

---

## 📊 Example Queries

### Get today's output
```typescript
const outputs = await actualOutputDb.getAll({
  date: new Date(),
  lineId: 'line-id',
})
```

### Get running machines
```typescript
const machines = await machinesDb.getAll({
  status: 'running',
})
```

### Get pending work orders
```typescript
const workOrders = await workOrdersDb.getPending()
```

### Get pass/reject statistics
```typescript
const stats = await dataItemsDb.getStatistics({
  pn: 'PN-001',
  startDate: new Date('2025-12-01'),
  endDate: new Date('2025-12-31'),
})
```

---

## 🔧 Common Patterns

### Create with relations
```typescript
const workOrder = await prisma.workOrder.create({
  data: {
    // ... work order data
    tasks: {
      create: [
        { description: 'Task 1' },
        { description: 'Task 2' },
      ],
    },
    notes: {
      create: [
        { text: 'Note 1', author: 'John' },
      ],
    },
  },
  include: {
    tasks: true,
    notes: true,
  },
})
```

### Update with where clause
```typescript
await prisma.machine.updateMany({
  where: { status: 'idle' },
  data: { status: 'running' },
})
```

### Aggregate data
```typescript
const summary = await prisma.actualOutput.groupBy({
  by: ['lineId', 'date'],
  _sum: {
    output: true,
    reject: true,
  },
})
```

---

## 🐛 Troubleshooting

### Can't connect to database
1. Check `.env.local` exists
2. Verify DATABASE_URL is correct
3. Restart dev server: `npm run dev`

### Prisma Client not found
```bash
npm run prisma:generate
```

### Schema out of sync
```bash
npm run prisma:push
```

---

## 📚 Files Created

- `prisma/schema.prisma` - Database schema
- `lib/prisma.ts` - Prisma client singleton
- `lib/db-helpers.ts` - Helper functions
- `app/api/*/route.ts` - API routes
- `app/example-server/page.tsx` - SSR example
- `app/example-client/page.tsx` - CSR example
- `prisma/seed.ts` - Seed script
- `PRISMA_SETUP.md` - Full documentation

---

**Need help? Check `PRISMA_SETUP.md` for detailed documentation!**
