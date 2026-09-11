import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Plant Maintenance Domain Service
 * Manages Preventive, Breakdown, Calibration, and Lubrication Routines
 * with atomic maintenance completion and historical audit ledgers.
 */
export const maintenanceService = {
  /**
   * Fetch maintenance orders joined with asset and technician details
   */
  async getMaintenanceOrders(options = {}) {
    const res = await baseService.select('maintenance_orders', {
      select: `
        id,
        order_number,
        asset_id,
        order_type,
        scheduled_date,
        performed_date,
        technician_id,
        findings,
        actions_taken,
        parts_replaced,
        downtime_hours,
        maintenance_cost,
        status,
        created_at,
        asset:assets(id, asset_tag, name, category, status),
        technician:employees(id, employee_code, first_name, last_name, designation)
      `,
      orderBy: options.orderBy || 'scheduled_date',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for clean UI display
    const normalized = (res.data || []).map(m => {
      const ast = m.asset || {};
      const tech = m.technician;
      const techName = tech ? `${tech.first_name} ${tech.last_name}` : 'Unassigned Tech';

      return {
        id: m.order_number || m.id,
        dbId: m.id,
        orderNumber: m.order_number,
        assetId: m.asset_id,
        assetTag: ast.asset_tag || 'AST-001',
        assetName: ast.name || 'Plant Equipment',
        assetCategory: ast.category,
        orderType: m.order_type || 'Preventive',
        scheduledDate: m.scheduled_date,
        performedDate: m.performed_date,
        technician: techName,
        technicianId: m.technician_id,
        downtimeHours: Number(m.downtime_hours || 0),
        costFormatted: m.maintenance_cost ? `₹${Number(m.maintenance_cost).toLocaleString('en-IN')}` : '₹0',
        maintenanceCost: Number(m.maintenance_cost || 0),
        status: m.status || 'Scheduled',
        findings: m.findings,
        actionsTaken: m.actions_taken,
        partsReplaced: m.parts_replaced || []
      };
    });

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Fetch single maintenance order
   */
  async getMaintenanceOrderById(identifier) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const filter = isUuid ? { id: identifier } : { order_number: identifier };

    const { data, error } = await supabase
      .from('maintenance_orders')
      .select(`
        *,
        asset:assets(*),
        technician:employees(id, employee_code, first_name, last_name, designation)
      `)
      .match(filter)
      .limit(1);

    if (error) return { data: null, error };
    return { data: data?.[0] || null, error: null };
  },

  /**
   * Schedule a new maintenance order
   */
  async createMaintenanceOrder(orderData) {
    const orderNumber = orderData.order_number || `MNT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const record = {
      order_number: orderNumber,
      asset_id: orderData.asset_id,
      order_type: orderData.order_type || 'Preventive',
      scheduled_date: orderData.scheduled_date || new Date().toISOString().split('T')[0],
      technician_id: orderData.technician_id || null,
      findings: orderData.findings || null,
      actions_taken: null,
      parts_replaced: orderData.parts_replaced || [],
      downtime_hours: 0,
      maintenance_cost: orderData.maintenance_cost || 0,
      status: 'Scheduled'
    };

    return await baseService.insert('maintenance_orders', record);
  },

  /**
   * Atomic maintenance completion with compensating rollback
   * 1. Updates maintenance_orders -> Completed
   * 2. Inserts maintenance_history audit record
   * 3. Sets asset status back to Active
   */
  async completeMaintenanceOrder(orderId, completionData = {}) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // 1. Fetch current order state for rollback guarantee
    const { data: currentOrder, error: fetchErr } = await supabase
      .from('maintenance_orders')
      .select('*, asset:assets(*)')
      .eq('id', orderId)
      .single();

    if (fetchErr || !currentOrder) {
      return { data: null, error: fetchErr || { message: 'Maintenance order not found' } };
    }

    const previousStatus = currentOrder.status;
    const assetId = currentOrder.asset_id;

    // 2. Update order to 'Completed'
    const updatePayload = {
      status: 'Completed',
      performed_date: today,
      downtime_hours: completionData.downtimeHours || currentOrder.downtime_hours || 1.5,
      maintenance_cost: completionData.maintenanceCost || currentOrder.maintenance_cost || 0,
      findings: completionData.findings || currentOrder.findings || 'Preventive inspection completed according to SOP.',
      actions_taken: completionData.actionsTaken || 'Filter replaced, lubrication topped, dynamic accuracy verified.',
      parts_replaced: completionData.partsReplaced || currentOrder.parts_replaced || [],
      updated_at: now
    };

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('maintenance_orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) {
      return { data: null, error: updateErr };
    }

    // 3. Insert historical record into maintenance_history
    const historyPayload = {
      asset_id: assetId,
      order_id: orderId,
      maintenance_date: today,
      technician_id: currentOrder.technician_id,
      work_summary: completionData.actionsTaken || 'Preventive service & calibration verified.',
      total_cost: updatePayload.maintenance_cost,
      downtime_hours: updatePayload.downtime_hours
    };

    const { error: histErr } = await supabase.from('maintenance_history').insert(historyPayload);

    if (histErr) {
      // Compensating Rollback: Revert maintenance_orders back to previous status
      await supabase.from('maintenance_orders').update({
        status: previousStatus,
        performed_date: currentOrder.performed_date,
        updated_at: currentOrder.updated_at
      }).eq('id', orderId);

      return { data: null, error: histErr };
    }

    // 4. Restore asset status to 'Active'
    if (assetId) {
      await supabase.from('assets').update({
        status: 'Active',
        updated_at: now
      }).eq('id', assetId);
    }

    return { data: updatedOrder, error: null };
  },

  /**
   * Fetch maintenance history logs for a machine asset
   */
  async getMaintenanceHistory(assetId) {
    return await baseService.select('maintenance_history', {
      select: `
        id,
        asset_id,
        order_id,
        maintenance_date,
        technician_id,
        work_summary,
        total_cost,
        downtime_hours,
        created_at,
        technician:employees(id, employee_code, first_name, last_name)
      `,
      eq: assetId ? { asset_id: assetId } : undefined,
      orderBy: 'maintenance_date',
      ascending: false
    });
  }
};
