import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

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

    return {
      ...res,
      data: normalized
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
