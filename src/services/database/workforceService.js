import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Workforce Domain Service
 * Provides queries and mutations for Employees, Departments, Shifts,
 * Technician Work Logs, and Task Lifecycle Management.
 */
export const workforceService = {
  /**
   * Fetch all staff members joined with Department, Primary Role, and Shift
   */
  async getStaffList(options = {}) {
    const res = await baseService.select('employees', {
      select: `
        id,
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        designation,
        current_status,
        avatar_color,
        skills,
        qualifications,
        date_of_joining,
        is_active,
        department:departments!employees_department_id_fkey(id, code, name),
        role:roles!employees_role_id_fkey(id, code, name),
        shift:shifts!employees_current_shift_id_fkey(id, shift_code, name, start_time, end_time)
      `,
      orderBy: options.orderBy || 'employee_code',
      ascending: options.ascending ?? true,
      ...options
    });

    if (res.error) return res;

    // Normalize employee data for clean frontend integration
    const normalizedStaff = (res.data || []).map(emp => {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Precision Technician';
      const nameParts = fullName.split(' ');
      const initials = nameParts.map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'GP';

      return {
        id: emp.employee_code || emp.id,
        dbId: emp.id,
        name: fullName,
        initials: initials,
        email: emp.email,
        phone: emp.phone,
        department: emp.department?.name || 'Production Machining',
        departmentCode: emp.department?.code,
        designation: emp.designation || 'Precision Specialist',
        role: emp.role?.name || emp.designation || 'CNC Operator',
        roleCode: emp.role?.code,
        shift: emp.shift?.name || 'First Shift (06:00 - 14:30)',
        shiftCode: emp.shift?.shift_code,
        status: emp.current_status || 'Working',
        avatarColor: emp.avatar_color || '#7A1F3D',
        skills: emp.skills || ['Precision Machining'],
        qualifications: emp.qualifications || [],
        isActive: emp.is_active
      };
    });

    return {
      ...res,
      data: normalizedStaff
    };
  },

  /**
   * Fetch single staff member by UUID or employee_code
   */
  async getStaffById(identifier) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const filter = isUuid ? { id: identifier } : { employee_code: identifier };

    const res = await baseService.select('employees', {
      select: `
        id, employee_code, first_name, last_name, email, phone, designation,
        current_status, avatar_color, skills, qualifications, date_of_joining, is_active,
        department:departments!employees_department_id_fkey(id, code, name),
        role:roles!employees_role_id_fkey(id, code, name),
        shift:shifts!employees_current_shift_id_fkey(id, shift_code, name)
      `,
      eq: filter
    });

    return {
      data: res.data?.[0] || null,
      error: res.error,
      latencyMs: res.latencyMs
    };
  },

  /**
   * Fetch all manufacturing plant departments
   */
  async getDepartments(options = {}) {
    return await baseService.select('departments', {
      orderBy: 'name',
      ascending: true,
      ...options
    });
  },

  /**
   * Fetch operational shift rosters
   */
  async getShifts(options = {}) {
    return await baseService.select('shifts', {
      orderBy: 'start_time',
      ascending: true,
      ...options
    });
  },

  /**
   * Update staff member operational status
   */
  async updateStaffStatus(employeeId, status) {
    return await baseService.update('employees', employeeId, { current_status: status });
  },

  /**
   * Fetch live daily operational work logs
   */
  async getWorkLogs(options = {}) {
    const res = await baseService.select('work_logs', {
      select: `
        id,
        date,
        period,
        start_time,
        end_time,
        duration_mins,
        work_type,
        task_name,
        work_order_no,
        spindle_serial,
        machine_name,
        bay_name,
        quantity_completed,
        progress_percentage,
        status,
        remarks,
        created_at,
        employee:employees(id, employee_code, first_name, last_name),
        department:departments(id, code, name),
        machine:machines(id, code, name),
        production_bay:production_bays(id, code, name)
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    const normalized = (res.data || []).map(wl => {
      const empName = wl.employee 
        ? `${wl.employee.first_name} ${wl.employee.last_name}`.trim()
        : 'Rahul Patil';
      const empCode = wl.employee?.employee_code || 'GPS-EMP-104';

      const durMins = wl.duration_mins || 90;
      const hours = Math.floor(durMins / 60);
      const mins = durMins % 60;
      const durationStr = `${hours}h ${mins.toString().padStart(2, '0')}m`;

      return {
        id: wl.id,
        dbId: wl.id,
        employeeId: empCode,
        employeeName: empName,
        date: wl.date ? new Date(wl.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '09 Sep 2026',
        period: wl.period || 'Shift A',
        startTime: wl.start_time ? new Date(wl.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:45 AM',
        endTime: wl.end_time ? new Date(wl.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:30 AM',
        duration: durationStr,
        durationMinutes: durMins,
        workType: wl.work_type || 'Production',
        task: wl.task_name,
        workOrder: wl.work_order_no || 'WO-2026-0148',
        spindle: wl.spindle_serial || 'SP-1042',
        machine: wl.machine_name || wl.machine?.name || 'CNC-03',
        bay: wl.bay_name || wl.production_bay?.name || 'Bay 1',
        department: wl.department?.name || 'Production',
        quantityCompleted: wl.quantity_completed || 1,
        progress: wl.progress_percentage || 100,
        status: wl.status === 'Working' ? 'Working' : (wl.status === 'Paused' ? 'Paused' : 'Completed'),
        remarks: wl.remarks || ''
      };
    });

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Start a new work log task for a technician
   */
  async startWorkLog(data) {
    let employeeId = data.employeeId;
    // Resolve employee_code to UUID if needed
    if (employeeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)) {
      const eRes = await baseService.select('employees', {
        select: 'id',
        eq: { employee_code: employeeId }
      });
      if (eRes.data?.[0]) employeeId = eRes.data[0].id;
    }

    const payload = {
      employee_id: employeeId,
      date: new Date().toISOString().split('T')[0],
      period: data.period || 'Shift A',
      start_time: new Date().toISOString(),
      duration_mins: 0,
      work_type: data.workType || 'Production',
      task_name: data.task || 'Shop Floor Task',
      work_order_no: data.workOrder || 'WO-2026-0148',
      spindle_serial: data.spindle || 'SP-1042',
      machine_name: data.machine || 'CNC-03',
      bay_name: data.bay || 'Bay 1',
      progress_percentage: 5,
      status: 'Working',
      remarks: data.remarks || 'Task started on shop floor.'
    };

    return await baseService.insert('work_logs', payload);
  },

  /**
   * Pause an active work log
   */
  async pauseWorkLog(id, reason = 'Machine calibration / maintenance') {
    return await baseService.update('work_logs', id, {
      status: 'Paused',
      remarks: `Paused: ${reason}`
    });
  },

  /**
   * Resume a paused work log
   */
  async resumeWorkLog(id) {
    return await baseService.update('work_logs', id, {
      status: 'Working'
    });
  },

  /**
   * Complete and sign off a work log task
   */
  async completeWorkLog(id, remarks = 'Task completed and signed off.') {
    return await baseService.update('work_logs', id, {
      status: 'Completed',
      progress_percentage: 100,
      end_time: new Date().toISOString(),
      remarks: remarks
    });
  },

  // --------------------------------------------------------------------------
  // DAILY ATTENDANCE & TIME-CLOCK METHODS
  // --------------------------------------------------------------------------

  /**
   * Fetch daily attendance records with employee and shift joins
   */
  async getAttendance(options = {}) {
    const res = await baseService.select('attendance', {
      select: `
        id,
        employee_id,
        shift_id,
        date,
        check_in,
        check_out,
        status,
        total_hours,
        overtime_hours,
        remarks,
        created_at,
        employee:employees!attendance_employee_id_fkey(
          id, employee_code, first_name, last_name, designation,
          department:departments(id, code, name)
        ),
        shift:shifts(id, shift_code, name, start_time, end_time)
      `,
      orderBy: options.orderBy || 'date',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for clean UI display
    const normalized = (res.data || []).map(a => {
      const emp = a.employee || {};
      const shf = a.shift || {};
      const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Technician';

      const formatTime = (ts) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };

      return {
        id: a.id,
        employeeId: a.employee_id,
        employeeCode: emp.employee_code || 'GPS-EMP-101',
        employeeName: empName,
        designation: emp.designation,
        department: emp.department?.name || 'Manufacturing',
        shiftName: shf.name || 'Shift A (06:00 - 14:30)',
        date: a.date,
        checkInTime: formatTime(a.check_in),
        checkOutTime: formatTime(a.check_out),
        checkInRaw: a.check_in,
        checkOutRaw: a.check_out,
        status: a.status || 'Present',
        totalHours: Number(a.total_hours || 0),
        overtimeHours: Number(a.overtime_hours || 0),
        remarks: a.remarks
      };
    });

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Record punch/clock in for employee.
   * Prevents duplicate check-in for the same date.
   */
  async clockIn({ employeeId, shiftId = null, remarks = null }) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if attendance already exists for today
    const { data: existing, error: findErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();

    if (findErr) return { data: null, error: findErr };

    if (existing && existing.check_in) {
      return {
        data: null,
        error: { message: `Employee is already clocked in today at ${new Date(existing.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` }
      };
    }

    if (existing) {
      // Update check_in
      const { data: updated, error: upErr } = await supabase
        .from('attendance')
        .update({
          check_in: now,
          status: 'Present',
          remarks: remarks || existing.remarks,
          updated_at: now
        })
        .eq('id', existing.id)
        .select()
        .single();

      return { data: updated, error: upErr };
    }

    // Insert new attendance record
    const { data: inserted, error: insErr } = await supabase
      .from('attendance')
      .insert({
        employee_id: employeeId,
        shift_id: shiftId,
        date: today,
        check_in: now,
        status: 'Present',
        remarks: remarks || 'Clocked in via shop floor station.'
      })
      .select()
      .single();

    return { data: inserted, error: insErr };
  },

  /**
   * Record punch/clock out for employee and compute hours worked.
   */
  async clockOut({ employeeId, remarks = null }) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { data: existing, error: findErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();

    if (findErr) return { data: null, error: findErr };

    if (!existing || !existing.check_in) {
      return {
        data: null,
        error: { message: 'Cannot clock out: No active clock-in recorded for today.' }
      };
    }

    if (existing.check_out) {
      return {
        data: null,
        error: { message: `Employee has already clocked out today at ${new Date(existing.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` }
      };
    }

    // Calculate duration in hours
    const checkInTime = new Date(existing.check_in);
    const checkOutTime = new Date(now);
    const diffMs = checkOutTime - checkInTime;
    const totalHours = Math.max(0.25, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
    const overtimeHours = Math.max(0, Math.round((totalHours - 8.5) * 100) / 100);

    const { data: updated, error: upErr } = await supabase
      .from('attendance')
      .update({
        check_out: now,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        remarks: remarks || existing.remarks,
        updated_at: now
      })
      .eq('id', existing.id)
      .select()
      .single();

    return { data: updated, error: upErr };
  },

  /**
   * Admin/Manager override to mark attendance directly
   */
  async markAttendance(attendanceData) {
    return await supabase
      .from('attendance')
      .upsert({
        employee_id: attendanceData.employee_id,
        shift_id: attendanceData.shift_id || null,
        date: attendanceData.date || new Date().toISOString().split('T')[0],
        check_in: attendanceData.check_in || null,
        check_out: attendanceData.check_out || null,
        status: attendanceData.status || 'Present',
        total_hours: attendanceData.total_hours || 8.5,
        overtime_hours: attendanceData.overtime_hours || 0,
        remarks: attendanceData.remarks || 'Attendance recorded by supervisor.'
      }, { onConflict: 'employee_id,date' })
      .select()
      .single();
  }
};

export default workforceService;

