# Migration Guide: SQL to Prisma

## 📋 Mapping SQL ke Prisma Schema

Berikut adalah mapping dari SQL schema Anda ke Prisma schema:

### 1. actual_output Table

**SQL:**
```sql
create table public.actual_output (
  id bigserial not null,
  line_id uuid null,
  shift_number integer null default 1,
  -- ... other fields
)
```

**Prisma:**
```prisma
model ActualOutput {
  id            BigInt   @id @default(autoincrement())
  lineId        String?  @map("line_id") @db.Uuid
  shiftNumber   Int?     @default(1) @map("shift_number")
  // ... other fields
  
  @@map("actual_output")
}
```

**Key Points:**
- `bigserial` → `BigInt @default(autoincrement())`
- `uuid` → `String @db.Uuid`
- `snake_case` → `camelCase` dengan `@map("snake_case")`
- Table name mapping dengan `@@map("table_name")`

---

### 2. data_items Table

**SQL:**
```sql
create table public.data_items (
  sn text not null,
  status text null,
  constraint data_items_status_check check (
    status = any (array['pass'::text, 'reject'::text])
  )
)
```

**Prisma:**
```prisma
model DataItem {
  sn     String @id
  status String?
  
  @@map("data_items")
}
```

**Note:** Check constraints tidak didefinisikan di Prisma schema karena sudah ada di database. Prisma akan respect existing constraints.

---

### 3. Foreign Keys & Relations

**SQL:**
```sql
create table public.work_order (
  machine_id uuid null,
  constraint work_order_machine_id_fkey 
    foreign key (machine_id) references machine (id)
)
```

**Prisma:**
```prisma
model WorkOrder {
  machineId String? @map("machine_id") @db.Uuid
  machine   Machine? @relation(fields: [machineId], references: [id])
  
  @@map("work_order")
}

model Machine {
  id         String @id @db.Uuid
  workOrders WorkOrder[]
  
  @@map("machine")
}
```

**Key Points:**
- Foreign key field: `machineId String?`
- Relation field: `machine Machine?`
- Reverse relation: `workOrders WorkOrder[]`

---

### 4. Indexes

**SQL:**
```sql
create index idx_actual_output_pn 
  on public.actual_output using btree (pn);
```

**Prisma:**
```prisma
model ActualOutput {
  pn String?
  
  @@index([pn], name: "idx_actual_output_pn")
}
```

---

### 5. Unique Constraints

**SQL:**
```sql
constraint actual_output_line_id_shift_number_hour_slot_date_pn_key 
  unique (line_id, shift_number, hour_slot, date, pn)
```

**Prisma:**
```prisma
model ActualOutput {
  lineId      String?
  shiftNumber Int?
  hourSlot    String?
  date        DateTime?
  pn          String?
  
  @@unique([lineId, shiftNumber, hourSlot, date, pn], 
    name: "actual_output_line_id_shift_number_hour_slot_date_pn_key")
}
```

---

### 6. Default Values

**SQL:**
```sql
created_at timestamp with time zone null default now()
```

**Prisma:**
```prisma
createdAt DateTime? @default(now()) @map("created_at") @db.Timestamptz(6)
```

---

### 7. UUID Generation

**SQL:**
```sql
id uuid not null default gen_random_uuid()
```

**Prisma:**
```prisma
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
```

---

## 🔄 Type Mapping Reference

| PostgreSQL Type | Prisma Type | Notes |
|----------------|-------------|-------|
| `bigserial` | `BigInt @default(autoincrement())` | Auto-incrementing big integer |
| `uuid` | `String @db.Uuid` | UUID as string |
| `text` | `String` | Variable length text |
| `integer` | `Int` | 32-bit integer |
| `numeric` | `Decimal @db.Decimal` | Arbitrary precision decimal |
| `boolean` | `Boolean` | True/false |
| `timestamp` | `DateTime @db.Timestamp(6)` | Without timezone |
| `timestamptz` | `DateTime @db.Timestamptz(6)` | With timezone |
| `date` | `DateTime @db.Date` | Date only |

---

## 🚀 Migration Steps

### Option 1: Using `prisma db push` (Recommended untuk existing DB)

```bash
# 1. Setup environment variables
# Create .env.local with your Supabase credentials

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Push schema to database
npm run prisma:push
```

**Pros:**
- ✅ Simple dan cepat
- ✅ Tidak membuat migration files
- ✅ Cocok untuk database yang sudah ada

**Cons:**
- ❌ Tidak ada migration history
- ❌ Tidak bisa rollback

---

### Option 2: Using Migrations

```bash
# 1. Pull existing schema from database
npx prisma db pull

# 2. Review generated schema
# Edit prisma/schema.prisma if needed

# 3. Create initial migration
npx prisma migrate dev --name init

# 4. Generate Prisma Client
npm run prisma:generate
```

**Pros:**
- ✅ Migration history
- ✅ Bisa rollback
- ✅ Better for team collaboration

**Cons:**
- ❌ Lebih complex
- ❌ Butuh migration files management

---

## 📊 Data Migration (If Needed)

Jika Anda perlu migrate data dari satu format ke format lain:

```typescript
// prisma/migrate-data.ts
import prisma from '../lib/prisma'

async function migrateData() {
  // Example: Update all null values
  await prisma.actualOutput.updateMany({
    where: { output: null },
    data: { output: 0 },
  })
  
  console.log('Data migration completed')
}

migrateData()
```

Run dengan:
```bash
npx tsx prisma/migrate-data.ts
```

---

## 🔍 Verification

Setelah migration, verify dengan:

### 1. Prisma Studio
```bash
npm run prisma:studio
```

### 2. Test Queries
```typescript
// Test in a server component
const count = await prisma.actualOutput.count()
console.log(`Total records: ${count}`)

const sample = await prisma.actualOutput.findFirst()
console.log('Sample record:', sample)
```

### 3. Check Relations
```typescript
const workOrder = await prisma.workOrder.findFirst({
  include: {
    machine: true,
    tasks: true,
    notes: true,
  },
})
console.log('Work order with relations:', workOrder)
```

---

## ⚠️ Important Notes

### 1. BigInt Handling

JavaScript tidak bisa serialize BigInt secara default. Jika Anda perlu return BigInt dari API:

```typescript
// In API route
return NextResponse.json(
  JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  )
)
```

Atau convert ke Number jika valuenya tidak terlalu besar:

```typescript
const output = await prisma.actualOutput.findFirst()
return {
  ...output,
  id: Number(output.id),
}
```

### 2. UUID vs String

Prisma menggunakan String untuk UUID. Pastikan saat query menggunakan string:

```typescript
// ✅ Correct
await prisma.machine.findUnique({
  where: { id: 'uuid-string-here' }
})

// ❌ Wrong
await prisma.machine.findUnique({
  where: { id: someUuidObject }
})
```

### 3. Decimal Handling

Prisma Decimal type returns Decimal object. Convert to number jika perlu:

```typescript
const output = await prisma.actualOutput.findFirst()
const outputNumber = output.output?.toNumber() ?? 0
```

### 4. Date Handling

Prisma returns JavaScript Date objects. Format sesuai kebutuhan:

```typescript
import moment from 'moment'

const output = await prisma.actualOutput.findFirst()
const formattedDate = moment(output.date).format('YYYY-MM-DD')
```

---

## 🎯 Best Practices

### 1. Use Transactions for Related Data

```typescript
const result = await prisma.$transaction(async (tx) => {
  const workOrder = await tx.workOrder.create({
    data: { /* ... */ },
  })
  
  await tx.task.createMany({
    data: [
      { workOrderId: workOrder.id, description: 'Task 1' },
      { workOrderId: workOrder.id, description: 'Task 2' },
    ],
  })
  
  return workOrder
})
```

### 2. Use Select for Performance

```typescript
// Only fetch needed fields
const machines = await prisma.machine.findMany({
  select: {
    id: true,
    nameMachine: true,
    status: true,
  },
})
```

### 3. Use Include for Relations

```typescript
// Fetch with relations
const workOrders = await prisma.workOrder.findMany({
  include: {
    machine: true,
    tasks: true,
  },
})
```

### 4. Handle Errors Properly

```typescript
try {
  const result = await prisma.actualOutput.create({ data })
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    console.error('Duplicate entry')
  } else {
    console.error('Database error:', error)
  }
}
```

---

## 📝 Checklist

- [ ] Review Prisma schema matches SQL schema
- [ ] Setup `.env.local` with database credentials
- [ ] Run `npm run prisma:generate`
- [ ] Run `npm run prisma:push` or `npx prisma migrate dev`
- [ ] Test connection with `npm run prisma:studio`
- [ ] Verify all tables exist
- [ ] Test CRUD operations
- [ ] Check foreign key relations work
- [ ] Verify indexes are created
- [ ] Test with sample data

---

**Migration Complete! 🎉**

Your SQL database is now fully integrated with Prisma ORM!
