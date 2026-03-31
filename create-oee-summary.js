const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Creating table oee_summary...');
    try {
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.oee_summary (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        date date NOT NULL,
        shift_id uuid,
        line_id uuid NOT NULL,
        machine_id uuid NOT NULL,

        planned_time_seconds bigint,
        operating_time_seconds bigint,
        downtime_seconds bigint,

        total_output bigint,
        good_output bigint,
        reject_output bigint,

        availability numeric(6,4),
        performance numeric(6,4),
        quality numeric(6,4),
        oee numeric(6,4),

        created_at timestamptz DEFAULT now(),

        FOREIGN KEY (machine_id) REFERENCES public.machine(id),
        FOREIGN KEY (line_id) REFERENCES public.line(id),
        FOREIGN KEY (shift_id) REFERENCES public.shift(id)
      );
    `);
        console.log('Table oee_summary created.');
    } catch (error) {
        console.error('Error creating table:', error);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
