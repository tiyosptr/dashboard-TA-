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

    // Seed Processes
    console.log('📦 Seeding Processes...')
    const process1 = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000301' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000301',
            name: 'Assembly',
            index: 1,
            machineId: machine1.id,
        },
    })

    const process2 = await prisma.process.upsert({
        where: { id: '00000000-0000-0000-0000-000000000302' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000302',
            name: 'VIFG',
            index: 2,
            machineId: machine2.id,
        },
    })

    console.log(`✅ Created processes: ${process1.name}, ${process2.name}`)

    // Seed LineProcess
    console.log('📦 Seeding Line-Process associations...')
    const lp1 = await prisma.lineProcess.upsert({
        where: { id: '00000000-0000-0000-0000-000000000401' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000401',
            lineId: line1.id,
            processId: process1.id,
            processOrder: 1,
        },
    })

    const lp2 = await prisma.lineProcess.upsert({
        where: { id: '00000000-0000-0000-0000-000000000402' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000402',
            lineId: line1.id,
            processId: process2.id,
            processOrder: 2,
        },
    })

    console.log(`✅ Created line-process associations`)

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

    // Seed Part Numbers (Pn)
    console.log('📦 Seeding Part Numbers...')
    const pn1 = await prisma.pn.upsert({
        where: { id: '00000000-0000-0000-0000-000000000501' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000501',
            partNumber: 'PN-001',
            lineId: line1.id,
        },
    })

    console.log(`✅ Created part number: ${pn1.partNumber}`)

    // Seed Serial Numbers (Sn) and Data Items
    console.log('📦 Seeding Serial Numbers & Data Items...')
    const dataItems = []
    for (let i = 1; i <= 20; i++) {
        const snId = `00000000-0000-0000-0000-0000000006${String(i).padStart(2, '0')}`
        const diId = `00000000-0000-0000-0000-0000000007${String(i).padStart(2, '0')}`

        // Create SN
        await prisma.sn.upsert({
            where: { id: snId },
            update: {},
            create: {
                id: snId,
                partNumberId: pn1.id,
                serialNumber: `SN-${String(i).padStart(6, '0')}`,
            },
        })

        // Create DataItem linked to SN and LineProcess
        const item = await prisma.dataItem.upsert({
            where: { id: diId },
            update: {},
            create: {
                id: diId,
                sn: snId,
                lineProcessId: lp1.id,
                status: Math.random() > 0.1 ? 'pass' : 'reject',
            },
        })
        dataItems.push(item)
    }

    console.log(`✅ Created ${dataItems.length} serial numbers & data items`)

    // Seed Actual Output (linked to data items)
    console.log('📦 Seeding Actual Output...')
    const outputs = []
    for (let i = 0; i < Math.min(dataItems.length, 10); i++) {
        const hour = 7 + i
        const aoId = `00000000-0000-0000-0000-0000000008${String(i + 1).padStart(2, '0')}`
        const output = await prisma.actualOutput.upsert({
            where: { id: aoId },
            update: {},
            create: {
                id: aoId,
                dataItemId: dataItems[i].id,
                hourSlot: `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`,
                output: dataItems[i].status ?? 'pass',
                targetOutput: 1000,
            },
        })
        outputs.push(output)
    }

    console.log(`✅ Created ${outputs.length} actual output records`)

    // Seed Shifts
    console.log('📦 Seeding Shifts...')
    await prisma.shift.upsert({
        where: { id: '00000000-0000-0000-0000-000000000901' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000901',
            shiftName: 'Shift 1',
            startTime: new Date('1970-01-01T07:00:00'),
            endTime: new Date('1970-01-01T15:00:00'),
        },
    })

    await prisma.shift.upsert({
        where: { id: '00000000-0000-0000-0000-000000000902' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000902',
            shiftName: 'Shift 2',
            startTime: new Date('1970-01-01T15:00:00'),
            endTime: new Date('1970-01-01T23:00:00'),
        },
    })

    console.log(`✅ Created shifts`)

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
