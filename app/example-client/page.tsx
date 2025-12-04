/**
 * Example: Client-Side Data Fetching
 * 
 * This example shows how to fetch data using API routes in a Client Component
 */

'use client'

import { useEffect, useState } from 'react'
import { actualOutputApi, machinesApi, workOrdersApi } from '@/lib/db-helpers'

export default function ExampleClientPage() {
    const [actualOutputs, setActualOutputs] = useState<any[]>([])
    const [machines, setMachines] = useState<any[]>([])
    const [workOrders, setWorkOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch data on component mount
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true)

                // Fetch all data in parallel
                const [outputsData, machinesData, workOrdersData] = await Promise.all([
                    actualOutputApi.getAll(),
                    machinesApi.getAll({ status: 'running' }),
                    workOrdersApi.getAll({ status: 'pending' }),
                ])

                setActualOutputs(outputsData)
                setMachines(machinesData)
                setWorkOrders(workOrdersData)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch data')
                console.error('Error fetching data:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    // Handle create new actual output
    const handleCreateOutput = async () => {
        try {
            const newOutput = await actualOutputApi.create({
                lineId: '00000000-0000-0000-0000-000000000001',
                shiftNumber: 1,
                hourSlot: '8:00-9:00',
                output: 95,
                reject: 5,
                targetOutput: 100,
                pn: 'PN-001',
            })

            // Add to state
            setActualOutputs([newOutput, ...actualOutputs])
            alert('Output created successfully!')
        } catch (err) {
            alert('Failed to create output')
            console.error(err)
        }
    }

    // Handle update machine status
    const handleUpdateMachine = async (machineId: string, newStatus: string) => {
        try {
            const updated = await machinesApi.update({
                id: machineId,
                status: newStatus,
            })

            // Update state
            setMachines(machines.map(m =>
                m.id === machineId ? updated : m
            ))
            alert('Machine updated successfully!')
        } catch (err) {
            alert('Failed to update machine')
            console.error(err)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl text-red-500">Error: {error}</div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Client-Side Example</h1>

            {/* Actions */}
            <section className="mb-8">
                <button
                    onClick={handleCreateOutput}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Create Sample Output
                </button>
            </section>

            {/* Actual Outputs */}
            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                    Actual Outputs ({actualOutputs.length})
                </h2>
                <div className="grid gap-4">
                    {actualOutputs.slice(0, 5).map((output) => (
                        <div key={output.id} className="border p-4 rounded">
                            <p><strong>Hour Slot:</strong> {output.hourSlot}</p>
                            <p><strong>Output:</strong> {output.output}</p>
                            <p><strong>Reject:</strong> {output.reject}</p>
                            <p><strong>Target:</strong> {output.targetOutput}</p>
                            <p><strong>PN:</strong> {output.pn}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Running Machines */}
            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                    Running Machines ({machines.length})
                </h2>
                <div className="grid gap-4">
                    {machines.map((machine) => (
                        <div key={machine.id} className="border p-4 rounded">
                            <p><strong>Name:</strong> {machine.nameMachine}</p>
                            <p><strong>Line:</strong> {machine.nameLine}</p>
                            <p><strong>Status:</strong> {machine.status}</p>
                            <p><strong>Running Hours:</strong> {machine.totalRunningHours}</p>

                            <div className="mt-2 space-x-2">
                                <button
                                    onClick={() => handleUpdateMachine(machine.id, 'maintenance')}
                                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                                >
                                    Set Maintenance
                                </button>
                                <button
                                    onClick={() => handleUpdateMachine(machine.id, 'idle')}
                                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                                >
                                    Set Idle
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Work Orders */}
            <section>
                <h2 className="text-2xl font-semibold mb-4">
                    Pending Work Orders ({workOrders.length})
                </h2>
                <div className="grid gap-4">
                    {workOrders.map((wo) => (
                        <div key={wo.id} className="border p-4 rounded">
                            <p><strong>Code:</strong> {wo.workOrderCode}</p>
                            <p><strong>Machine:</strong> {wo.machineName}</p>
                            <p><strong>Priority:</strong> {wo.priority}</p>
                            <p><strong>Assigned To:</strong> {wo.assignedTo}</p>
                            <p><strong>Tasks:</strong> {wo.tasks?.length || 0}</p>
                            <p><strong>Notes:</strong> {wo.notes?.length || 0}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
