import { Key } from "readline";

export interface OutputData {
  time: string;
  good: number;
  reject: number;
}

export interface MachineStatus {
  name_line: string;
  label: string;
  status: 'running' | 'warning' | 'downtime' | 'maintenance';
  id: string;
}

export interface Machine {
  id: string;
  name_machine: string;
  name_line: string | null;
  status: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  total_running_hours: string | null;
  name_process: string | null;
  process_id: string | null;
  line_id: string | null;
}

export interface HistoryData {
  month: string;
  maintenance: number;
  downtime: number;
  reject: number;
}

export interface CycleTimeData {
  time: string;
  value: number;
}

export interface TrendData {
  date: string;
  output: number;
  quality: number;
  efficiency: number;
  downtime: number;
}

export interface OEEData {
  label: string;
  value: number;
  color: string;
}

// Updated Work Order Status Type
export type WorkOrderStatus = 'Pending' | 'On-Solving' | 'On-Hold' | 'Completed';

export interface WorkOrder {
  id: Key | null | undefined;
  work_order_code?: string;
  type: string;
  priority: string;
  machine_id: string;
  machine_name: string;
  line_id?: string;
  name_line?: string;
  status: WorkOrderStatus; // Updated type
  assigned_to: string;
  created_at: string;
  schedule_date: string;
  completed_at?: string;
  estimated_duration: string;
  actual_duration?: string;
  description: string;
  tasks: Task[];
  requiredParts: Part[];
  notes: Note[];
  location?: string;
}

export interface Task {
  id: string;
  work_order_id?: string;
  description: string;
  completed: boolean;
  completed_at?: string;
}

export interface Part {
  id: string;
  work_order_id?: string;
  name: string;
  quantity: number;
  available: boolean;
}

export interface Note {
  id: string;
  work_order_id?: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface MaintenanceHistory {
  id: string;
  machineId: string;
  date: string;
  workOrderId: string;
  type: string;
  duration: string;
  cost: string;
  technician: string;
  description: string;
  partsUsed: string[];
}

export interface PreventiveSchedule {
  id: string;
  machineId: string;
  machineName: string;
  scheduleType: 'Time-based' | 'Condition-based';
  interval: string;
  lastMaintenance: string;
  nextMaintenance: string;
  status: 'Active' | 'Paused';
  conditions?: {
    runningHours?: number;
    cycleCount?: number;
    temperature?: number;
    vibration?: number;
  };
}

export interface MachineDetail {
  id: string;
  name: string;
  location: string;
  status: 'running' | 'warning' | 'downtime' | 'maintenance';
  metrics: {
    actualOutput: number;
    targetOutput: number;
    reject: number;
    throughput: number;
    cycleTime: number;
    targetCycleTime: number;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    uptime: number;
    downtime: number;
    temperature: number;
    vibration: number;
  };
  lastMaintenance: string;
  nextMaintenance: string;
  totalRunningHours: number;
}

export interface Notification {
  id: string;
  type: string;
  severity: string;
  machine_id: string;
  machine_name: string;
  messages: string;
  read: boolean;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  duration?: string;
  start_at: string;
  done_at?: string;
  work_order_id?: string;
  process_id?: string;
  name_line?: string;
}

export interface DowntimeAlert {
  id: number;
  machineId: string;
  machineName: string;
  timestamp: string;
  reason?: string;
}

export interface DefectByProcess {
  process: string;
  defectCount: number;
  percentage: number;
  color: string;
}

export type TabType = 'overview' | 'machine-dashboard' | 'work-orders' | 'machines' | 'history' | 'schedule' | 'notifications';

// Database types
export interface MachineDB {
  id: string;
  name_machine: string | null;
  name_line: string | null;
  status: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  total_running_hous: number | null;
  name_process: string | null;
  process_id: string | null;
  line_id: string | null;
}

export interface Technician {
  id: string;
  name: string;
  specialization: string;
  contact_info: string;
  is_active: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}