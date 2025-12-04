/**
 * Example: Server-Side Data Fetching
 * 
 * This example shows how to fetch data using Prisma in a Server Component
 */

import { actualOutputDb, machinesDb, workOrdersDb } from '@/lib/db-helpers'

export default async function ExampleServerPage() {
    // Fetch data directly from database (Server-Side)
    const actualOutputs = await actualOutputDb.getAll({
        date: new Date(),
    })

    const machines = await machinesDb.getAll({
        status: 'running',
    })

    const pendingWorkOrders = await workOrdersDb.getPending()

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Server-Side Example</h1>

            {/* Actual Outputs */}
            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Today's Actual Output</h2>
                <div className="grid gap-4">
                    {actualOutputs.map((output) => (
                        <div key={output.id.toString()} className="border p-4 rounded">
                            <p><strong>Hour Slot:</strong> {output.hourSlot}</p>
                            <p><strong>Output:</strong> {output.output?.toString()}</p>
                            <p><strong>Reject:</strong> {output.reject?.toString()}</p>
                            <p><strong>Target:</strong> {output.targetOutput?.toString()}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Running Machines */}
            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Running Machines</h2>
                <div className="grid gap-4">
                    {machines.map((machine) => (
                        <div key={machine.id} className="border p-4 rounded">
                            <p><strong>Name:</strong> {machine.nameMachine}</p>
                            <p><strong>Line:</strong> {machine.nameLine}</p>
                            <p><strong>Status:</strong> {machine.status}</p>
                            <p><strong>Running Hours:</strong> {machine.totalRunningHours}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pending Work Orders */}
            <section>
                <h2 className="text-2xl font-semibold mb-4">Pending Work Orders</h2>
                <div className="grid gap-4">
                    {pendingWorkOrders.map((wo) => (
                        <div key={wo.id} className="border p-4 rounded">
                            <p><strong>Code:</strong> {wo.workOrderCode}</p>
                            <p><strong>Machine:</strong> {wo.machineName}</p>
                            <p><strong>Priority:</strong> {wo.priority}</p>
                            <p><strong>Assigned To:</strong> {wo.assignedTo}</p>
                            <p><strong>Tasks:</strong> {wo.tasks.length}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
