# 📝 Implementation Checklist & Tips

## ✅ Setup Checklist

### Phase 1: Initial Setup
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` file created
- [ ] DATABASE_URL configured
- [ ] DIRECT_URL configured
- [ ] Prisma Client generated (`npm run prisma:generate`)
- [ ] Schema pushed to database (`npm run prisma:push`)
- [ ] Connection tested (`npm run prisma:studio`)

### Phase 2: Verification
- [ ] All 11 tables visible in Prisma Studio
- [ ] Indexes created successfully
- [ ] Foreign keys working
- [ ] Sample data seeded (optional: `npm run prisma:seed`)
- [ ] Example pages working (`/example-server`, `/example-client`)

### Phase 3: Integration
- [ ] Existing pages updated to use Prisma
- [ ] API routes tested
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Type definitions checked

### Phase 4: Production Ready
- [ ] Environment variables set in production
- [ ] Build tested locally (`npm run build`)
- [ ] Performance optimized
- [ ] Monitoring setup
- [ ] Documentation reviewed

---

## 💡 Best Practices

### 1. Always Use Type-Safe Queries

✅ **Good:**
```typescript
const machines = await prisma.machine.findMany({
  where: { status: 'running' },
  select: {
    id: true,
    nameMachine: true,
    status: true,
  },
})
```

❌ **Bad:**
```typescript
const machines = await prisma.$queryRaw`SELECT * FROM machine`
```

---

### 2. Handle Errors Properly

✅ **Good:**
```typescript
try {
  const machine = await machinesDb.create(data)
  return { success: true, data: machine }
} catch (error) {
  if (error.code === 'P2002') {
    return { success: false, error: 'Machine already exists' }
  }
  console.error('Database error:', error)
  return { success: false, error: 'Failed to create machine' }
}
```

❌ **Bad:**
```typescript
const machine = await machinesDb.create(data)
// No error handling
```

---

### 3. Use Transactions for Related Data

✅ **Good:**
```typescript
const result = await prisma.$transaction(async (tx) => {
  const workOrder = await tx.workOrder.create({
    data: workOrderData,
  })
  
  await tx.task.createMany({
    data: tasks.map(t => ({
      ...t,
      workOrderId: workOrder.id,
    })),
  })
  
  return workOrder
})
```

❌ **Bad:**
```typescript
const workOrder = await prisma.workOrder.create({ data: workOrderData })
await prisma.task.createMany({ data: tasks }) // Might fail, leaving orphaned work order
```

---

### 4. Optimize Queries

✅ **Good:**
```typescript
// Only fetch needed fields
const machines = await prisma.machine.findMany({
  select: {
    id: true,
    nameMachine: true,
    status: true,
  },
})

// Use include for relations
const workOrders = await prisma.workOrder.findMany({
  include: {
    tasks: true,
  },
})
```

❌ **Bad:**
```typescript
// Fetch all fields + all relations
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

---

### 5. Use Server Components When Possible

✅ **Good:**
```typescript
// Server Component (faster, better SEO)
export default async function MachinesPage() {
  const machines = await machinesDb.getAll()
  return <MachinesList machines={machines} />
}
```

❌ **Bad:**
```typescript
// Client Component (slower, extra API call)
'use client'
export default function MachinesPage() {
  const [machines, setMachines] = useState([])
  useEffect(() => {
    machinesApi.getAll().then(setMachines)
  }, [])
  return <MachinesList machines={machines} />
}
```

---

### 6. Implement Caching

✅ **Good:**
```typescript
import { unstable_cache } from 'next/cache'

export const getMachines = unstable_cache(
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

### 7. Handle BigInt Serialization

✅ **Good:**
```typescript
// In API route
const data = await prisma.actualOutput.findMany()

return NextResponse.json(
  data.map(item => ({
    ...item,
    id: item.id.toString(), // Convert BigInt to string
  }))
)
```

❌ **Bad:**
```typescript
const data = await prisma.actualOutput.findMany()
return NextResponse.json(data) // Error: BigInt cannot be serialized
```

---

### 8. Use Proper Filtering

✅ **Good:**
```typescript
const outputs = await prisma.actualOutput.findMany({
  where: {
    date: {
      gte: startDate,
      lte: endDate,
    },
    lineId: lineId,
  },
})
```

❌ **Bad:**
```typescript
const outputs = await prisma.actualOutput.findMany()
const filtered = outputs.filter(o => 
  o.date >= startDate && o.date <= endDate && o.lineId === lineId
)
```

---

## 🎯 Common Patterns

### Pattern 1: CRUD with Validation

```typescript
// app/api/machines/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate
    if (!body.nameMachine) {
      return NextResponse.json(
        { error: 'Machine name is required' },
        { status: 400 }
      )
    }
    
    // Create
    const machine = await prisma.machine.create({
      data: body,
    })
    
    return NextResponse.json(machine, { status: 201 })
  } catch (error) {
    console.error('Error creating machine:', error)
    return NextResponse.json(
      { error: 'Failed to create machine' },
      { status: 500 }
    )
  }
}
```

---

### Pattern 2: Pagination

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    prisma.machine.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.machine.count(),
  ])

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
```

---

### Pattern 3: Search & Filter

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')
  const status = searchParams.get('status')

  const where: any = {}
  
  if (search) {
    where.nameMachine = {
      contains: search,
      mode: 'insensitive',
    }
  }
  
  if (status) {
    where.status = status
  }

  const machines = await prisma.machine.findMany({
    where,
    orderBy: { nameMachine: 'asc' },
  })

  return NextResponse.json(machines)
}
```

---

### Pattern 4: Aggregation

```typescript
export async function getOutputSummary(lineId: string, date: Date) {
  const summary = await prisma.actualOutput.aggregate({
    where: {
      lineId,
      date,
    },
    _sum: {
      output: true,
      reject: true,
    },
    _avg: {
      output: true,
    },
    _count: {
      id: true,
    },
  })

  return {
    totalOutput: summary._sum.output || 0,
    totalReject: summary._sum.reject || 0,
    averageOutput: summary._avg.output || 0,
    recordCount: summary._count.id,
  }
}
```

---

### Pattern 5: Upsert (Create or Update)

```typescript
export async function upsertActualOutput(data: any) {
  return await prisma.actualOutput.upsert({
    where: {
      actual_output_line_id_shift_number_hour_slot_date_pn_key: {
        lineId: data.lineId,
        shiftNumber: data.shiftNumber,
        hourSlot: data.hourSlot,
        date: data.date,
        pn: data.pn,
      },
    },
    update: {
      output: data.output,
      reject: data.reject,
    },
    create: data,
  })
}
```

---

## 🚨 Common Pitfalls to Avoid

### 1. N+1 Query Problem

❌ **Bad:**
```typescript
const workOrders = await prisma.workOrder.findMany()
for (const wo of workOrders) {
  wo.tasks = await prisma.task.findMany({
    where: { workOrderId: wo.id }
  })
}
```

✅ **Good:**
```typescript
const workOrders = await prisma.workOrder.findMany({
  include: {
    tasks: true,
  },
})
```

---

### 2. Not Using Transactions

❌ **Bad:**
```typescript
await prisma.workOrder.delete({ where: { id } })
await prisma.task.deleteMany({ where: { workOrderId: id } })
// If second query fails, work order is deleted but tasks remain
```

✅ **Good:**
```typescript
await prisma.$transaction([
  prisma.task.deleteMany({ where: { workOrderId: id } }),
  prisma.workOrder.delete({ where: { id } }),
])
```

---

### 3. Forgetting to Handle Null Values

❌ **Bad:**
```typescript
const output = await prisma.actualOutput.findFirst()
const total = output.output + output.reject // Error if null
```

✅ **Good:**
```typescript
const output = await prisma.actualOutput.findFirst()
const total = (output?.output?.toNumber() || 0) + (output?.reject?.toNumber() || 0)
```

---

### 4. Not Validating Input

❌ **Bad:**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  const machine = await prisma.machine.create({ data: body })
  return NextResponse.json(machine)
}
```

✅ **Good:**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  if (!body.nameMachine || !body.status) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }
  
  const machine = await prisma.machine.create({ data: body })
  return NextResponse.json(machine)
}
```

---

## 📊 Performance Tips

### 1. Use Indexes
```prisma
model ActualOutput {
  // ...
  @@index([lineId, date]) // For common queries
  @@index([pn])           // For filtering by PN
}
```

### 2. Limit Results
```typescript
const machines = await prisma.machine.findMany({
  take: 100, // Limit to 100 results
})
```

### 3. Select Only Needed Fields
```typescript
const machines = await prisma.machine.findMany({
  select: {
    id: true,
    nameMachine: true,
    // Don't fetch all fields
  },
})
```

### 4. Use Connection Pooling
Already configured in `.env.local`:
```env
DATABASE_URL="...?pgbouncer=true"
```

### 5. Cache Frequently Accessed Data
```typescript
const getMachines = unstable_cache(
  async () => machinesDb.getAll(),
  ['machines'],
  { revalidate: 60 }
)
```

---

## 🔍 Debugging Tips

### 1. Enable Query Logging
```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})
```

### 2. Use Prisma Studio
```bash
npm run prisma:studio
```

### 3. Check Generated SQL
```typescript
const query = prisma.machine.findMany({
  where: { status: 'running' }
})

console.log(query) // See generated SQL
```

### 4. Monitor Performance
Check Supabase Dashboard → Database → Query Performance

---

## 📚 Quick Reference

### Common Prisma Methods
- `findMany()` - Get multiple records
- `findUnique()` - Get one record by unique field
- `findFirst()` - Get first matching record
- `create()` - Create new record
- `createMany()` - Create multiple records
- `update()` - Update one record
- `updateMany()` - Update multiple records
- `delete()` - Delete one record
- `deleteMany()` - Delete multiple records
- `upsert()` - Create or update
- `count()` - Count records
- `aggregate()` - Aggregate data
- `groupBy()` - Group and aggregate

### Common Where Clauses
- `equals` - Exact match
- `not` - Not equal
- `in` - In array
- `notIn` - Not in array
- `lt` - Less than
- `lte` - Less than or equal
- `gt` - Greater than
- `gte` - Greater than or equal
- `contains` - String contains
- `startsWith` - String starts with
- `endsWith` - String ends with

---

## ✅ Final Checklist

Before going to production:

- [ ] All environment variables set
- [ ] Database schema synced
- [ ] Indexes created
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Type safety verified
- [ ] Performance optimized
- [ ] Caching implemented
- [ ] Monitoring setup
- [ ] Documentation updated
- [ ] Team trained
- [ ] Backup strategy in place

---

**You're Ready to Build! 🚀**

Keep this checklist handy and refer to it during development!
