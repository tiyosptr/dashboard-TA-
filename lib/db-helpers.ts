/**
 * Database Helper Functions
 * 
 * This file contains helper functions for both Server-Side Rendering (SSR)
 * and Client-Side Rendering (CSR) data fetching.
 * 
 * Usage:
 * - For SSR: Import and use the database functions directly (they use Prisma)
 * - For CSR: Use the API fetch functions (they call the API routes)
 */

import prisma from './prisma'
import { Prisma } from '@prisma/client'

// ============================================================================
// SERVER-SIDE FUNCTIONS (Use Prisma directly)
// ============================================================================

/**
 * Actual Output Functions
 */
export const actualOutputDb = {
    // Get all actual outputs with optional filters
    async getAll(filters?: {
        dataItemId?: string
    }) {
        return await prisma.actualOutput.findMany({
            where: filters,
            include: { dataItem: true },
            orderBy: { createdAt: 'desc' },
        })
    },

    // Get actual output by ID
    async getById(id: string) {
        return await prisma.actualOutput.findUnique({
            where: { id },
            include: { dataItem: true },
        })
    },

    // Create new actual output
    async create(data: Prisma.ActualOutputCreateInput) {
        return await prisma.actualOutput.create({
            data,
        })
    },

    // Update actual output
    async update(id: string, data: Prisma.ActualOutputUpdateInput) {
        return await prisma.actualOutput.update({
            where: { id },
            data,
        })
    },

    // Delete actual output
    async delete(id: string) {
        return await prisma.actualOutput.delete({
            where: { id },
        })
    },
}

/**
 * Data Items Functions
 */
export const dataItemsDb = {
    // Get all data items with optional filters
    async getAll(filters?: {
        lineProcessId?: string
        status?: string
    }) {
        return await prisma.dataItem.findMany({
            where: filters,
            include: {
                snRelation: true,
                lineProcess: true,
            },
            orderBy: { createdAt: 'desc' },
        })
    },

    // Get data item by ID
    async getById(id: string) {
        return await prisma.dataItem.findUnique({
            where: { id },
            include: {
                snRelation: true,
                lineProcess: true,
            },
        })
    },

    // Create new data item
    async create(data: Prisma.DataItemCreateInput) {
        return await prisma.dataItem.create({
            data,
        })
    },

    // Update data item
    async update(id: string, data: Prisma.DataItemUpdateInput) {
        return await prisma.dataItem.update({
            where: { id },
            data,
        })
    },

    // Delete data item
    async delete(id: string) {
        return await prisma.dataItem.delete({
            where: { id },
        })
    },

    // Get pass/reject statistics
    async getStatistics(filters?: {
        lineProcessId?: string
        startDate?: Date
        endDate?: Date
    }) {
        const where: any = {}
        if (filters?.lineProcessId) where.lineProcessId = filters.lineProcessId
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {}
            if (filters.startDate) where.createdAt.gte = filters.startDate
            if (filters.endDate) where.createdAt.lte = filters.endDate
        }

        return await prisma.dataItem.groupBy({
            by: ['status'],
            where,
            _count: {
                id: true,
            },
        })
    },
}

/**
 * Lines Functions
 */
export const linesDb = {
    // Get all lines
    async getAll() {
        return await prisma.line.findMany({
            orderBy: { name: 'asc' },
        })
    },

    // Get line by ID
    async getById(id: string) {
        return await prisma.line.findUnique({
            where: { id },
        })
    },

    // Create new line
    async create(data: Prisma.LineCreateInput) {
        return await prisma.line.create({
            data,
        })
    },

    // Update line
    async update(id: string, data: Prisma.LineUpdateInput) {
        return await prisma.line.update({
            where: { id },
            data,
        })
    },

    // Delete line
    async delete(id: string) {
        return await prisma.line.delete({
            where: { id },
        })
    },
}

/**
 * Machines Functions
 */
export const machinesDb = {
    // Get all machines with optional filters
    async getAll(filters?: {
        status?: string
        lineId?: string
    }) {
        return await prisma.machine.findMany({
            where: filters,
            include: {
                notifications: true,
                workOrders: true,
            },
            orderBy: { nameMachine: 'asc' },
        })
    },

    // Get machine by ID
    async getById(id: string) {
        return await prisma.machine.findUnique({
            where: { id },
            include: {
                notifications: true,
                workOrders: true,
            },
        })
    },

    // Create new machine
    async create(data: Prisma.MachineCreateInput) {
        return await prisma.machine.create({
            data,
        })
    },

    // Update machine
    async update(id: string, data: Prisma.MachineUpdateInput) {
        return await prisma.machine.update({
            where: { id },
            data,
        })
    },

    // Delete machine
    async delete(id: string) {
        return await prisma.machine.delete({
            where: { id },
        })
    },

    // Get machines needing maintenance
    async getNeedingMaintenance() {
        return await prisma.machine.findMany({
            where: {
                nextMaintenance: {
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
                },
            },
            orderBy: { nextMaintenance: 'asc' },
        })
    },
}

/**
 * Machine Status Log Functions
 */
export const machineStatusLogDb = {
    // Get current open event for a machine
    async getCurrentEvent(machineId: string) {
        return await prisma.machineStatusLog.findFirst({
            where: { machineId, endTime: null },
            orderBy: { startTime: 'desc' },
        })
    },

    // Get running hours for a machine over a period
    async getRunningHours(machineId: string, since?: Date) {
        const where: any = {
            machineId,
            status: 'active', // Only count 'active' as running
        }
        if (since) {
            where.startTime = { gte: since }
        }

        const logs = await prisma.machineStatusLog.findMany({
            where,
            select: { durationSeconds: true, startTime: true, endTime: true },
        })

        let totalSeconds = 0
        for (const log of logs) {
            if (log.durationSeconds) {
                totalSeconds += Number(log.durationSeconds)
            } else if (!log.endTime) {
                // Live: current open event
                totalSeconds += Math.floor((Date.now() - log.startTime.getTime()) / 1000)
            }
        }

        return {
            totalSeconds,
            totalHours: Math.round(totalSeconds / 36) / 100,
        }
    },

    // Get status breakdown for a machine
    async getStatusBreakdown(machineId: string, days: number = 7) {
        const since = new Date()
        since.setDate(since.getDate() - days)

        const logs = await prisma.machineStatusLog.findMany({
            where: {
                machineId,
                startTime: { gte: since },
            },
            select: { status: true, durationSeconds: true, startTime: true, endTime: true },
        })

        const breakdown: Record<string, number> = {}
        for (const log of logs) {
            const seconds = log.durationSeconds
                ? Number(log.durationSeconds)
                : (!log.endTime ? Math.floor((Date.now() - log.startTime.getTime()) / 1000) : 0)

            breakdown[log.status] = (breakdown[log.status] || 0) + seconds
        }

        return breakdown
    },
}

/**
 * Work Orders Functions
 */
export const workOrdersDb = {
    // Get all work orders with optional filters
    async getAll(filters?: {
        status?: string
        machineId?: string
        lineId?: string
        priority?: string
    }) {
        return await prisma.workOrder.findMany({
            where: filters,
            include: {
                machine: true,
                line: true,
                notes: true,
                tasks: true,
            },
            orderBy: { createdAt: 'desc' },
        })
    },

    // Get work order by ID
    async getById(id: string) {
        return await prisma.workOrder.findUnique({
            where: { id },
            include: {
                machine: true,
                line: true,
                notes: true,
                tasks: true,
            },
        })
    },

    // Create new work order
    async create(data: Prisma.WorkOrderCreateInput) {
        return await prisma.workOrder.create({
            data,
            include: {
                notes: true,
                tasks: true,
            },
        })
    },

    // Update work order
    async update(id: string, data: Prisma.WorkOrderUpdateInput) {
        return await prisma.workOrder.update({
            where: { id },
            data,
            include: {
                notes: true,
                tasks: true,
            },
        })
    },

    // Delete work order
    async delete(id: string) {
        return await prisma.workOrder.delete({
            where: { id },
        })
    },

    // Get pending work orders
    async getPending() {
        return await prisma.workOrder.findMany({
            where: {
                status: {
                    in: ['pending', 'in_progress'],
                },
            },
            include: {
                machine: true,
                tasks: true,
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' },
            ],
        })
    },
}

/**
 * Notifications Functions
 */
export const notificationsDb = {
    // Get all notifications
    async getAll(filters?: {
        read?: string
        severity?: string
        machineId?: string
    }) {
        return await prisma.notification.findMany({
            where: filters,
            include: {
                machine: true,
            },
            orderBy: { startAt: 'desc' },
        })
    },

    // Get notification by ID
    async getById(id: string) {
        return await prisma.notification.findUnique({
            where: { id },
            include: {
                machine: true,
            },
        })
    },

    // Create new notification
    async create(data: Prisma.NotificationCreateInput) {
        return await prisma.notification.create({
            data,
        })
    },

    // Update notification
    async update(id: string, data: Prisma.NotificationUpdateInput) {
        return await prisma.notification.update({
            where: { id },
            data,
        })
    },

    // Mark as read
    async markAsRead(id: string) {
        return await prisma.notification.update({
            where: { id },
            data: { read: 'true' },
        })
    },

    // Acknowledge notification
    async acknowledge(id: string, acknowledgedBy: string) {
        return await prisma.notification.update({
            where: { id },
            data: {
                acknowladged: 'true',
                acknowladgedBy: acknowledgedBy,
                acknowladgedAt: new Date(),
            },
        })
    },

    // Get unread notifications
    async getUnread() {
        return await prisma.notification.findMany({
            where: {
                read: {
                    not: 'true',
                },
            },
            include: {
                machine: true,
            },
            orderBy: { startAt: 'desc' },
        })
    },
}

/**
 * Processes Functions
 */
export const processesDb = {
    async getAll(filters?: {
        lineId?: string
    }) {
        const whereClause: any = {}
        if (filters?.lineId) {
            whereClause.lineProcesses = { some: { lineId: filters.lineId } }
        }
        return await prisma.process.findMany({
            where: whereClause,
            orderBy: { index: 'asc' },
        })
    },

    // Get process by ID
    async getById(id: string) {
        return await prisma.process.findUnique({
            where: { id },
        })
    },

    // Create new process
    async create(data: Prisma.ProcessCreateInput) {
        return await prisma.process.create({
            data,
        })
    },

    // Update process
    async update(id: string, data: Prisma.ProcessUpdateInput) {
        return await prisma.process.update({
            where: { id },
            data,
        })
    },

    // Delete process
    async delete(id: string) {
        return await prisma.process.delete({
            where: { id },
        })
    },
}

/**
 * Technicians Functions
 */
export const techniciansDb = {
    // Get all technicians
    async getAll(filters?: {
        isActive?: boolean
    }) {
        return await prisma.technician.findMany({
            where: filters,
            orderBy: { name: 'asc' },
        })
    },

    // Get technician by ID
    async getById(id: string) {
        return await prisma.technician.findUnique({
            where: { id },
        })
    },

    // Create new technician
    async create(data: Prisma.TechnicianCreateInput) {
        return await prisma.technician.create({
            data,
        })
    },

    // Update technician
    async update(id: string, data: Prisma.TechnicianUpdateInput) {
        return await prisma.technician.update({
            where: { id },
            data,
        })
    },

    // Delete technician
    async delete(id: string) {
        return await prisma.technician.delete({
            where: { id },
        })
    },

    // Get active technicians
    async getActive() {
        return await prisma.technician.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        })
    },
}

// ============================================================================
// CLIENT-SIDE FUNCTIONS (Use API routes)
// ============================================================================

/**
 * Client-side API helpers
 * Use these functions in client components
 */

export const actualOutputApi = {
    async getAll(filters?: Record<string, string>) {
        const params = new URLSearchParams(filters)
        const response = await fetch(`/api/actual-output?${params}`)
        if (!response.ok) throw new Error('Failed to fetch actual outputs')
        return response.json()
    },

    async create(data: any) {
        const response = await fetch('/api/actual-output', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to create actual output')
        return response.json()
    },

    async update(data: any) {
        const response = await fetch('/api/actual-output', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to update actual output')
        return response.json()
    },

    async delete(id: string) {
        const response = await fetch(`/api/actual-output?id=${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete actual output')
        return response.json()
    },
}

export const dataItemsApi = {
    async getAll(filters?: Record<string, string>) {
        const params = new URLSearchParams(filters)
        const response = await fetch(`/api/data-items?${params}`)
        if (!response.ok) throw new Error('Failed to fetch data items')
        return response.json()
    },

    async create(data: any) {
        const response = await fetch('/api/data-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to create data item')
        return response.json()
    },

    async update(data: any) {
        const response = await fetch('/api/data-items', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to update data item')
        return response.json()
    },

    async delete(sn: string) {
        const response = await fetch(`/api/data-items?sn=${sn}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete data item')
        return response.json()
    },
}

export const machinesApi = {
    async getAll(filters?: Record<string, string>) {
        const params = new URLSearchParams(filters)
        const response = await fetch(`/api/machines?${params}`)
        if (!response.ok) throw new Error('Failed to fetch machines')
        return response.json()
    },

    async create(data: any) {
        const response = await fetch('/api/machines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to create machine')
        return response.json()
    },

    async update(data: any) {
        const response = await fetch('/api/machines', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to update machine')
        return response.json()
    },

    async delete(id: string) {
        const response = await fetch(`/api/machines?id=${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete machine')
        return response.json()
    },
}

export const workOrdersApi = {
    async getAll(filters?: Record<string, string>) {
        const params = new URLSearchParams(filters)
        const response = await fetch(`/api/work-orders?${params}`)
        if (!response.ok) throw new Error('Failed to fetch work orders')
        return response.json()
    },

    async create(data: any) {
        const response = await fetch('/api/work-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to create work order')
        return response.json()
    },

    async update(data: any) {
        const response = await fetch('/api/work-orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to update work order')
        return response.json()
    },

    async delete(id: string) {
        const response = await fetch(`/api/work-orders?id=${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete work order')
        return response.json()
    },
}
