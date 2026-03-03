import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seeding...')

    // Seed Lines
    console.log('📦 Seeding Lines...')
    const line1 = await prisma.line.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Line 1',
            status: 'active',
            totalRunningHours: 1000,
        },
    })

    const line2 = await prisma.line.upsert({
        where: { id: '00000000-0000-0000-0000-000000000002' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000002',
            name: 'Line 2',
            status: 'maintenance',
            totalRunningHours: 800,
        },
    })

    console.log(`✅ Created lines: ${line1.name}, ${line2.name}`)

    // Seed Machines
    console.log('📦 Seeding Machines...')
    const machine1 = await prisma.machine.upsert({
        where: { id: '00000000-0000-0000-0000-000000000101' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000101',
            nameMachine: 'Machine A1',
            status: 'active',
            nextMaintenance: new Date('2025-12-15'),
            lastMaintenance: new Date('2025-11-15'),
            totalRunningHours: '500',
        },
    })

    const machine2 = await prisma.machine.upsert({
        where: { id: '00000000-0000-0000-0000-000000000102' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000102',
            nameMachine: 'Machine A2',
            status: 'inactive',
            nextMaintenance: new Date('2025-12-20'),
            lastMaintenance: new Date('2025-11-20'),
            totalRunningHours: '450',
        },
    })

    console.log(`✅ Created machines: ${machine1.nameMachine}, ${machine2.nameMachine}`)

    // Seed Technicians
    console.log('📦 Seeding Technicians...')
    const tech1 = await prisma.technician.upsert({
        where: { id: '00000000-0000-0000-0000-000000000201' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000201',
            name: 'John Doe',
            specialization: 'Mechanical',
            contactInfo: 'john@example.com',
            isActive: true,
        },
    })

    const tech2 = await prisma.technician.upsert({
        where: { id: '00000000-0000-0000-0000-000000000202' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000202',
            name: 'Jane Smith',
            specialization: 'Electrical',
            contactInfo: 'jane@example.com',
            isActive: true,
        },
    })

    console.log(`✅ Created technicians: ${tech1.name}, ${tech2.name}`)

    // Seed Actual Output
    console.log('📦 Seeding Actual Output...')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const outputs = []
    for (let hour = 7; hour <= 16; hour++) {
        const output = await prisma.actualOutput.create({
            data: {
                lineId: line1.id,
                shiftNumber: 1,
                hourSlot: `${hour}:00-${hour + 1}:00`,
                output: Math.floor(Math.random() * 100) + 80,
                reject: Math.floor(Math.random() * 10),
                targetOutput: 100,
                date: today,
                pn: 'PN-001',
            },
        })
        outputs.push(output)
    }

    console.log(`✅ Created ${outputs.length} actual output records`)

    // Seed Data Items
    console.log('📦 Seeding Data Items...')
    const dataItems = []
    for (let i = 1; i <= 20; i++) {
        const item = await prisma.dataItem.create({
            data: {
                sn: `SN-${String(i).padStart(6, '0')}`,
                pn: 'PN-001',
                wo: 'WO-2025-001',
                nameLine: 'Line 1',
                lineId: line1.id,
                nameProcess: 'Assembly',
                status: Math.random() > 0.1 ? 'pass' : 'reject',
            },
        })
        dataItems.push(item)
    }

    console.log(`✅ Created ${dataItems.length} data items`)

    // Seed Work Orders
    console.log('📦 Seeding Work Orders...')
    const workOrder1 = await prisma.workOrder.create({
        data: {
            type: 'Preventive',
            priority: 'high',
            machineId: machine1.id,
            machineName: machine1.nameMachine,
            lineId: line1.id,
            nameLine: line1.name,
            status: 'pending',
            assignedTo: tech1.name,
            createdAt: new Date(),
            scheduleDate: new Date('2025-12-15'),
            estimatedDuration: '2 hours',
            description: 'Regular maintenance check',
            workOrderCode: 'WO-2025-001',
            tasks: {
                create: [
                    {
                        description: 'Check oil levels',
                        completed: 'false',
                    },
                    {
                        description: 'Inspect belts',
                        completed: 'false',
                    },
                ],
            },
            notes: {
                create: [
                    {
                        text: 'Machine showing signs of wear',
                        author: tech1.name,
                        timestamp: new Date(),
                    },
                ],
            },
        },
    })

    console.log(`✅ Created work order: ${workOrder1.workOrderCode}`)

    // Seed Notifications
    console.log('📦 Seeding Notifications...')
    const notification1 = await prisma.notification.create({
        data: {
            type: 'maintenance',
            severity: 'warning',
            machineId: machine1.id,
            machineName: machine1.nameMachine,
            messages: 'Maintenance due in 7 days',
            read: 'false',
            acknowladged: 'false',
            startAt: new Date(),
        },
    })

    console.log(`✅ Created notification for ${notification1.machineName}`)

    console.log('✅ Database seeding completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
