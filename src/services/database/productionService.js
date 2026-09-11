import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';
import { workOrderService } from './workOrderService';

/**
 * Production Board & Pipeline Domain Service
 * Provides queries and mutations for Shop Floor Stages, Machine Cell Telemetry,
 * and Manufacturing Execution.
 */
export const productionService = {
  /**
   * Fetch all 8 production stages and active work orders grouped by stage
   */
  async getProductionPipeline() {
    const [opsRes, wosRes] = await Promise.all([
      baseService.select('production_operations', {
        orderBy: 'created_at',
        ascending: true
      }),
      workOrderService.getWorkOrders()
    ]);

    if (opsRes.error) return opsRes;
    if (wosRes.error) return wosRes;

    const workOrders = wosRes.data || [];

    const defaultStages = [
      { id: 1, key: 'material', name: 'Material', desc: 'Bar stock inspection & sawing' },
      { id: 2, key: 'machining', name: 'Machining', desc: 'CNC Turning & boring' },
      { id: 3, key: 'grinding', name: 'Grinding', desc: 'Studer taper & journal grinding' },
      { id: 4, key: 'assembly', name: 'Assembly', desc: 'Cleanroom Class 1000 fitting' },
      { id: 5, key: 'balancing', name: 'Balancing', desc: 'Schenck dynamic dual-plane G0.4' },
      { id: 6, key: 'testing', name: 'Testing', desc: '4h dynamic run-in & thermal test' },
      { id: 7, key: 'qc', name: 'QC', desc: 'Micron air gauging & runout' },
      { id: 8, key: 'dispatch', name: 'Dispatch', desc: 'Anti-corrosion pack & shipping' }
    ];

    const stagesWithCounts = defaultStages.map(stage => {
      const ordersInStage = workOrders.filter(w => (w.currentStage || '').toLowerCase() === stage.key.toLowerCase());
      return {
        ...stage,
        count: ordersInStage.length,
        orders: ordersInStage
      };
    });

    return {
      data: {
        stages: stagesWithCounts,
        workOrders: workOrders,
        totalOrders: workOrders.length
      },
      error: null,
      latencyMs: (opsRes.latencyMs || 0) + (wosRes.latencyMs || 0)
    };
  },

  /**
   * Fetch list of all production operations from database
   */
  async getProductionOperations() {
    return await baseService.select('production_operations', {
      select: `
        id,
        code,
        name,
        stage,
        standard_time_mins,
        description,
        is_active,
        default_bay:production_bays(id, code, name),
        default_machine:machines(id, code, name)
      `,
      orderBy: 'created_at',
      ascending: true
    });
  },

  /**
   * Advance a work order to start production or next manufacturing stage
   */
  async startProduction(workOrderId, bayId = null, machineId = null, employeeId = null) {
    const updatePayload = {
      status: 'In Progress'
    };
    if (bayId) updatePayload.assigned_bay_id = bayId;
    if (machineId) updatePayload.assigned_machine_id = machineId;
    if (employeeId) updatePayload.lead_technician_id = employeeId;

    return await baseService.update('work_orders', workOrderId, updatePayload);
  },

  /**
   * Put a work order on hold
   */
  async pauseProduction(workOrderId, reason = 'Operator Hold') {
    return await baseService.update('work_orders', workOrderId, {
      status: 'On Hold',
      notes: `Production paused: ${reason} at ${new Date().toISOString()}`
    });
  },

  /**
   * Resume an on-hold work order
   */
  async resumeProduction(workOrderId) {
    return await baseService.update('work_orders', workOrderId, {
      status: 'In Progress'
    });
  },

  /**
   * Sign off complete manufacturing
   */
  async completeProduction(workOrderId) {
    return await baseService.update('work_orders', workOrderId, {
      status: 'Completed',
      progress_percentage: 100,
      actual_completion_date: new Date().toISOString().split('T')[0]
    });
  }
};

export default productionService;
