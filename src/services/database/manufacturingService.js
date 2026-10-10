import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';
import { isCleanSlateMode } from '../../utils/dataMode';

/**
 * Manufacturing Domain Service
 * Provides queries and mutations for Production Bays, Shop Floor Equipment,
 * Machine Assignments, and Bay Telemetry.
 */
export const manufacturingService = {
  /**
   * Fetch all production bays
   */
  async getBays(options = {}) {
    return await baseService.select('production_bays', {
      orderBy: options.orderBy || 'code',
      ascending: options.ascending ?? true,
      ...options
    });
  },

  /**
   * Fetch single bay by id or code
   */
  async getBayById(id) {
    const res = await baseService.select('production_bays', { eq: { id } });
    return {
      data: res.data?.[0] || null,
      error: res.error,
      latencyMs: res.latencyMs
    };
  },

  /**
   * Fetch all machines joined with assigned Production Bay
   */
  async getMachines(options = {}) {
    return await baseService.select('machines', {
      select: `
        id,
        code,
        name,
        machine_type,
        precision_tolerance_microns,
        status,
        is_active,
        bay:production_bays(id, code, name, bay_type)
      `,
      orderBy: options.orderBy || 'code',
      ascending: options.ascending ?? true,
      ...options
    });
  },

  /**
   * Fetch single machine by id or code
   */
  async getMachineById(id) {
    const res = await baseService.select('machines', {
      select: 'id, code, name, machine_type, precision_tolerance_microns, status, is_active, bay:production_bays(id, code, name)',
      eq: { id }
    });
    return {
      data: res.data?.[0] || null,
      error: res.error,
      latencyMs: res.latencyMs
    };
  },

  /**
   * Update machine status
   */
  async updateMachineStatus(id, status) {
    return await baseService.update('machines', id, { status });
  },

  /**
   * Fetch active shop bay assignments and cell telemetry
   */
  async getBayAssignments() {
    const res = await baseService.select('machine_assignments', {
      select: `
        id,
        status,
        assigned_date,
        start_time,
        end_time,
        machine:machines(
          id, code, name, machine_type,
          bay:production_bays(id, code, name, bay_type)
        ),
        employee:employees(id, employee_code, first_name, last_name, designation)
      `,
      eq: { status: 'Active' },
      orderBy: 'created_at',
      ascending: true
    });

    if (res.error) return res;

    // Normalization mapping for Production and Workforce views
    const normalized = (res.data || []).map((item, idx) => {
      const bayCode = item.machine?.bay?.code || `BAY-${idx + 1}`;
      const bayId = bayCode.toLowerCase().replace('bay-', 'bay-');
      const staffName = item.employee ? `${item.employee.first_name} ${item.employee.last_name}`.trim() : 'Technician';

      const mockWoList = ['WO-2026-0148', 'WO-2026-0149', 'WO-2026-0152', 'WO-2026-0153', 'WO-2026-0155', 'WO-2026-0152', 'WO-2026-0146', 'SR-2026-042'];
      const mockSpindles = ['SP-1042', 'SP-1044', 'SP-1048', 'SP-1049', 'SP-1052', 'SP-1048', 'SP-1038', 'SP-2025-0721'];
      const mockOps = ['Shaft Turning', 'Bearing Journal Micro-Finish', 'Bearing Assembly', 'Dynamic Balancing Dual-Plane', '4h Dynamic Run-in & Temp Test', 'Runout Inspection', 'Anti-Corrosion Shock-Crate Pack', 'Disassembly & Failure Analysis'];
      const mockUtil = [88, 108, 94, 88, 86, 95, 90, 94];

      return {
        id: item.id,
        bayId: bayId,
        bayName: item.machine?.bay?.name || `Bay ${idx + 1} — Precision Cell`,
        machine: `${item.machine?.code || 'CNC'} / ${item.machine?.name || 'Precision Rig'}`,
        machineName: item.machine?.name,
        assignedStaff: staffName,
        employeeId: item.employee?.employee_code || 'GPS-EMP-104',
        workOrder: mockWoList[idx % mockWoList.length],
        spindleSerial: mockSpindles[idx % mockSpindles.length],
        operation: mockOps[idx % mockOps.length],
        started: '08:30 AM',
        duration: '2h 15m',
        progress: 75,
        status: idx === 1 ? 'Overloaded' : 'Operating',
        utilization: mockUtil[idx % mockUtil.length]
      };
    });

    const defaultBays = [
      { id: 'bay-1', bayId: 'bay-1', bayName: 'Bay 1 — CNC Turning & Boring', machine: 'CNC-01 / Okuma LB3000 Lathe', assignedStaff: 'Rahul Patil (Master Machinist)', employeeId: 'GPS-EMP-104', workOrder: 'WO-2026-104', spindleSerial: 'GPS-2026-0842', operation: 'Shaft Turning', started: '08:30 AM', duration: '2h 15m', progress: 75, status: 'Operating', utilization: 88 },
      { id: 'bay-2', bayId: 'bay-2', bayName: 'Bay 2 — Precision Grinding', machine: 'GRD-01 / Studer S33 Cylindrical Grinder', assignedStaff: 'Suresh Sawant (Grinding Lead)', employeeId: 'GPS-EMP-105', workOrder: 'WO-2026-105', spindleSerial: 'GPS-2026-0845', operation: 'Bearing Journal Micro-Finish', started: '07:45 AM', duration: '3h 00m', progress: 85, status: 'Operating', utilization: 92 },
      { id: 'bay-3', bayId: 'bay-3', bayName: 'Bay 3 — Induction Heat Treatment', machine: 'IND-01 / Custom Induction Rig', assignedStaff: 'Anil Joshi (Metallurgy Tech)', employeeId: 'GPS-EMP-108', workOrder: 'WO-2026-106', spindleSerial: 'GPS-2026-0846', operation: 'Shaft Hardening 58-62 HRC', started: '09:00 AM', duration: '1h 30m', progress: 50, status: 'Operating', utilization: 78 },
      { id: 'bay-4', bayId: 'bay-4', bayName: 'Bay 4 — Cleanroom Assembly', machine: 'ASM-01 / Class 1000 Laminar Flow Hood', assignedStaff: 'Ganesh Kadam (Cleanroom Fitter)', employeeId: 'GPS-EMP-106', workOrder: 'WO-2026-107', spindleSerial: 'GPS-2026-0847', operation: 'Bearing Pack Assembly', started: '08:15 AM', duration: '2h 45m', progress: 65, status: 'Operating', utilization: 94 },
      { id: 'bay-5', bayId: 'bay-5', bayName: 'Bay 5 — Dynamic Balancing', machine: 'BAL-01 / Schenck SmartBalancing Rig', assignedStaff: 'Sachin Jadhav (Vibration Specialist)', employeeId: 'GPS-EMP-107', workOrder: 'WO-2026-108', spindleSerial: 'GPS-2026-0848', operation: 'Dual-Plane ISO G0.4 Balancing', started: '09:30 AM', duration: '1h 00m', progress: 40, status: 'Operating', utilization: 85 },
      { id: 'bay-6', bayId: 'bay-6', bayName: 'Bay 6 — Dynamic Run-in & Telemetry', machine: 'RUN-01 / Computerized Test Bench', assignedStaff: 'Vikram Shinde (Service Lead)', employeeId: 'GPS-EMP-109', workOrder: 'SRV-2026-0041', spindleSerial: 'GPS-2025-0740', operation: '4h High-Speed Run-in & Temp Test', started: '07:00 AM', duration: '3h 30m', progress: 90, status: 'Operating', utilization: 90 }
    ];

    return {
      ...res,
      data: normalized.length > 0 ? normalized : (isCleanSlateMode() ? [] : defaultBays)
    };
  },

  /**
   * Direct machine assignments query
   */
  async getMachineAssignments(options = {}) {
    return await baseService.select('machine_assignments', {
      select: `
        id,
        assigned_date,
        status,
        machine:machines(id, code, name),
        employee:employees(id, employee_code, first_name, last_name),
        shift:shifts(id, shift_code, name)
      `,
      ...options
    });
  },

  /**
   * Assign an employee to a machine cell
   */
  async assignMachine(machineId, employeeId, shiftId = null) {
    return await baseService.insert('machine_assignments', {
      machine_id: machineId,
      employee_id: employeeId,
      shift_id: shiftId,
      assigned_date: new Date().toISOString().split('T')[0],
      status: 'Active'
    });
  }
};

export default manufacturingService;
