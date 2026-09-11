import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Leave Management Domain Service
 * Manages Employee Leave Requests, Approvals, Rejections, and Balances
 * for Casual, Sick, and Privilege Leave categories.
 */
export const leaveService = {
  /**
   * Fetch all leave requests joined with employee and approver details
   */
  async getLeaveRequests(options = {}) {
    const res = await baseService.select('leave_requests', {
      select: `
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        approved_by,
        approved_at,
        created_at,
        employee:employees!leave_requests_employee_id_fkey(
          id, employee_code, first_name, last_name, designation,
          department:departments(id, code, name)
        ),
        approver:employees!leave_requests_approved_by_fkey(
          id, employee_code, first_name, last_name
        )
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for clean UI display
    const normalized = (res.data || []).map(l => {
      const emp = l.employee || {};
      const app = l.approver;
      const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Precision Technician';
      const appName = app ? `${app.first_name || ''} ${app.last_name || ''}`.trim() : null;

      return {
        id: l.id,
        employeeId: l.employee_id,
        employeeCode: emp.employee_code || 'GPS-EMP-101',
        employeeName: empName,
        designation: emp.designation,
        department: emp.department?.name || 'Manufacturing Operations',
        leaveType: l.leave_type,
        startDate: l.start_date,
        endDate: l.end_date,
        totalDays: Number(l.total_days || 1),
        reason: l.reason,
        status: l.status || 'Pending',
        approvedBy: appName,
        approvedById: l.approved_by,
        approvedAt: l.approved_at,
        createdAt: l.created_at
      };
    });

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Submit a new leave request
   */
  async createLeaveRequest(leaveData) {
    // Validate required fields
    if (!leaveData.employee_id) {
      return { data: null, error: { message: 'Employee ID is required.' } };
    }
    if (!leaveData.leave_type) {
      return { data: null, error: { message: 'Leave type is required.' } };
    }
    if (!leaveData.start_date || !leaveData.end_date) {
      return { data: null, error: { message: 'Start and End dates are required.' } };
    }

    const sDate = new Date(leaveData.start_date);
    const eDate = new Date(leaveData.end_date);
    if (eDate < sDate) {
      return { data: null, error: { message: 'End date cannot be prior to start date.' } };
    }

    const totalDays = leaveData.total_days || Math.max(1, Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1);

    const record = {
      employee_id: leaveData.employee_id,
      leave_type: leaveData.leave_type,
      start_date: leaveData.start_date,
      end_date: leaveData.end_date,
      total_days: totalDays,
      reason: leaveData.reason || 'Personal leave request.',
      status: 'Pending'
    };

    return await baseService.insert('leave_requests', record);
  },

  /**
   * Atomic leave request approval (Restricted to MANAGEMENT/ADMIN via RLS)
   */
  async approveLeaveRequest(requestId, approvedByEmployeeId = null) {
    const now = new Date().toISOString();

    const { data: request, error: fetchErr } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) {
      return { data: null, error: fetchErr || { message: 'Leave request not found.' } };
    }

    if (request.status !== 'Pending') {
      return { data: null, error: { message: `Cannot approve leave request in status "${request.status}".` } };
    }

    const { data: updated, error: updateErr } = await supabase
      .from('leave_requests')
      .update({
        status: 'Approved',
        approved_by: approvedByEmployeeId,
        approved_at: now,
        updated_at: now
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateErr) {
      return { data: null, error: updateErr };
    }

    return { data: updated, error: null };
  },

  /**
   * Reject leave request
   */
  async rejectLeaveRequest(requestId, approvedByEmployeeId = null, reason = 'Request declined by management.') {
    const now = new Date().toISOString();

    return await supabase
      .from('leave_requests')
      .update({
        status: 'Rejected',
        approved_by: approvedByEmployeeId,
        approved_at: now,
        reason: `${reason}`,
        updated_at: now
      })
      .eq('id', requestId)
      .select()
      .single();
  },

  /**
   * Cancel pending leave request
   */
  async cancelLeaveRequest(requestId) {
    return await supabase
      .from('leave_requests')
      .update({
        status: 'Cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('status', 'Pending')
      .select()
      .single();
  },

  /**
   * Get employee leave balances (Allocated, Taken, Remaining)
   */
  async getLeaveBalances(employeeId) {
    const { data: leaves, error } = await supabase
      .from('leave_requests')
      .select('leave_type, total_days, status')
      .eq('employee_id', employeeId)
      .eq('status', 'Approved');

    if (error) return { data: null, error };

    // Standard annual allocation
    const allocation = {
      'Casual Leave': 12,
      'Sick Leave': 10,
      'Privilege Leave': 15
    };

    const taken = {
      'Casual Leave': 0,
      'Sick Leave': 0,
      'Privilege Leave': 0
    };

    (leaves || []).forEach(l => {
      if (taken[l.leave_type] !== undefined) {
        taken[l.leave_type] += Number(l.total_days || 0);
      }
    });

    const balances = Object.keys(allocation).map(type => ({
      type,
      allocated: allocation[type],
      taken: taken[type],
      remaining: Math.max(0, allocation[type] - taken[type])
    }));

    return { data: balances, error: null };
  }
};
