/**
 * useDashboardData - SWR-based data fetching hook
 * 
 * Performance optimizations:
 * 1. Single API call instead of 4-5 separate fetches
 * 2. SWR handles caching, deduplication, and revalidation automatically
 * 3. refreshInterval: 10000 (10 seconds) keeps data fresh
 * 4. revalidateOnFocus: false prevents unnecessary refetches
 * 5. Tab-aware fetching: only fetches data for the active tab
 * 6. dedupingInterval: 5000 prevents duplicate requests within 5s
 */

import useSWR from 'swr'

// Typed response from /api/dashboard/summary
export interface DashboardSummary {
    success: boolean
    timestamp: string
    tab: string

    // Dashboard tab data
    actualOutput?: {
        hourly: {
            id: string
            line_id: string | null
            shift_number: number | null
            hour_slot: string | null
            output: number
            reject: number
            target_output: number
            date: string
            pn: string | null
        }[]
        summary: {
            totalOutput: number
            totalReject: number
            totalProduced: number
            totalTarget: number
            yieldRate: number
            performanceRate: number
            qualityRate: number
        }
    }

    oee?: {
        availability: number
        performance: number
        quality: number
        oee: number
    }

    machines?: {
        list: {
            id: string
            nameMachine: string | null
            nameLine?: string | null
            status: string | null
            nameProcess?: string | null
        }[]
        counts: {
            total: number
            running: number
            warning: number
            error: number
            maintenance: number
        }
        processes?: {
            processOrder: number | null;
            processId: string;
            processName: string | null;
            processIndex: number | null;
            machine: {
                id: string;
                nameMachine: string | null;
                status: string | null;
                nextMaintenance: string | null;
                lastMaintenance: string | null;
                totalRunningHours: string | null;
            } | null;
        }[];
    }

    notifications?: {
        unreadCount: number
        criticalCount: number
    }

    // Throughput Line data (from troughput_line table)
    throughput?: {
        latest: {
            id: string
            line_id: string | null
            line_process_id: string | null
            data_items_id: string | null
            actual_trougput: number | null
            actual_troughput: number | null
            shift_id: string | null
            rate: number | null
            total_pass: number | null
            eff: number | null
            interval_time: number | null
            created_at: string
        } | null
        history: {
            id: string
            line_id: string | null
            line_process_id: string | null
            data_items_id: string | null
            actual_trougput: number | null
            actual_troughput: number | null
            shift_id: string | null
            rate: number | null
            total_pass: number | null
            eff: number | null
            interval_time: number | null
            created_at: string
        }[]
    }

    // Cycle Time Line data (computed from actual_output + shift duration)
    cycleTimeLine?: {
        /** CT saat ini dalam detik/unit, null bila belum ada output */
        actual_cycle_time: number | null
        /** Jumlah unit pass VIFG dalam window waktu */
        total_output: number
        /** Durasi shift/window dalam detik */
        operating_time_seconds: number
        /** Nama proses terakhir (VIFG) yang digunakan */
        process_name: string | null
        /** line_process_id VIFG */
        line_process_id: string | null
        /** Nama shift yang dipakai untuk operating time */
        shift_name: string | null
        /** History CT dari tabel cycle_time_line (oldest → newest) */
        history: {
            id: string
            created_at: string
            actual_cycle_time: number | null
            line_id: string | null
            line_process_id: string | null
            shift_id: string | null
            actual_output_id: string | null
        }[]
    }

    // Analysis tab data
    trend?: {
        date: string
        output: number // Total produced (pass + reject)
        pass: number // Good output only
        reject: number
        target: number
        quality: number
        efficiency: number
        downtime: number
    }[]

    history?: {
        date: string // YYYY-MM-DD format
        maintenance: number // Minutes (changed from hours)
        downtime: number // Minutes (changed from hours)
        reject: number // Count
    }[]

    // Defect by Process data
    defectByProcess?: {
        lineProcessId: string;
        processName: string;
        totalProduced: number;
        totalPass: number;
        totalReject: number;
        defectRate: number;
    }[]
}

// SWR fetcher with error handling
const fetcher = async (url: string): Promise<DashboardSummary> => {
    const res = await fetch(url)
    if (!res.ok) {
        const error = new Error('Failed to fetch dashboard data')
        throw error
    }
    return res.json()
}

interface UseDashboardOptions {
    /** Which tab is active: 'dashboard' | 'analysis' */
    tab: 'dashboard' | 'analysis'
    /** Date filter (YYYY-MM-DD) */
    date?: string
    /** Shift number */
    shift?: number
    /** Line ID filter */
    lineId?: string | null
    /** Part Number filter */
    pn?: string | null
    /** Whether data fetching is enabled */
    enabled?: boolean
}

export function useDashboardData({
    tab,
    date,
    shift = 1,
    lineId,
    pn,
    enabled = true,
}: UseDashboardOptions) {
    // Build URL with query params - tab-aware fetching
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (date) params.set('date', date)
    params.set('shift', shift.toString())
    if (lineId) params.set('lineId', lineId)
    if (pn) params.set('pn', pn)

    const url = `/api/dashboard/summary?${params.toString()}`

    const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardSummary>(
        enabled ? url : null,  // Passing null disables fetching
        fetcher,
        {
            // Refresh every 10 seconds
            refreshInterval: 10000,

            // Don't refetch on window focus (we have interval already)
            revalidateOnFocus: false,

            // Deduplicate requests within 5 seconds
            dedupingInterval: 5000,

            // Keep showing stale data while revalidating
            revalidateIfStale: true,

            // Don't retry too aggressively on error
            errorRetryCount: 3,
            errorRetryInterval: 5000,

            // Keep previous data while loading new data (no flash)
            keepPreviousData: true,
        }
    )

    return {
        data,
        error,
        isLoading,
        isValidating,
        mutate,
        // Convenience accessors
        actualOutput: data?.actualOutput,
        oee: data?.oee,
        machines: data?.machines,
        notifications: data?.notifications,
        throughput: data?.throughput,
        cycleTimeLine: data?.cycleTimeLine,
        trend: data?.trend,
        history: data?.history,
        defectByProcess: data?.defectByProcess,
    }
}
