import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Work Order Domain Service
 * Provides queries and mutations for Precision Spindle Work Orders, Traveler Sheets,
 * and Stage Operations Routing.
 */
export const workOrderService = {
  /**
   * Fetch all active work orders with customer, spindle, bay, and machine joins
   */
  async getWorkOrders(options = {}) {
    const res = await baseService.select('work_orders', {
      select: `
        id,
        work_order_no,
        order_type,
        priority,
        current_stage,
        progress_percentage,
        planned_start_date,
        target_delivery_date,
        actual_completion_date,
        quantity,
        status,
        notes,
        created_at,
        customer_name,
        customer:customers(id, customer_code, company_name),
        model:spindle_models(id, model_code, model_name),
        spindle:spindles(id, serial_number, current_stage, status),
        bay:production_bays(id, code, name),
        machine:machines(id, code, name),
        lead_technician:employees(id, employee_code, first_name, last_name, designation)
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for clean frontend integration
    const normalized = (res.data || []).map(wo => {
      const techName = wo.lead_technician 
        ? `${wo.lead_technician.first_name} ${wo.lead_technician.last_name}`.trim()
        : 'Suresh Sawant';
      const techRole = wo.lead_technician?.designation ? `(${wo.lead_technician.designation})` : '';

      return {
        id: wo.work_order_no,
        dbId: wo.id,
        workOrderNo: wo.work_order_no,
        spindleSerial: wo.spindle?.serial_number || 'GPS-2026-0842',
        spindleId: wo.spindle?.id,
        spindleModel: wo.model?.model_code || 'GPS-HSK-A63-24K',
        customer: wo.customer?.company_name || wo.customer_name || 'Enterprise Client',
        customerId: wo.customer?.customer_code || 'CUST-01',
        currentStage: (wo.current_stage || 'machining').toLowerCase(),
        currentOperation: `Stage: ${wo.current_stage || 'Shaft Turning'}`,
        shopBay: wo.bay?.name || 'Bay 1 - CNC Turning & Boring',
        bayCode: wo.bay?.code,
        machineName: wo.machine?.name,
        assignedOperator: `${techName} ${techRole}`.trim(),
        priority: wo.priority || 'High',
        dueDate: wo.target_delivery_date || '2026-03-20',
        plannedStart: wo.planned_start_date,
        progress: wo.progress_percentage || 0,
        status: wo.status || 'In Progress',
        notes: wo.notes,
        totalOps: 8,
        completedOps: Math.round(((wo.progress_percentage || 0) / 100) * 8)
      };
    });

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Fetch a single work order by UUID or work_order_no (e.g. WO-2026-104)
   */
  async getWorkOrderById(identifier) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const filter = isUuid ? { id: identifier } : { work_order_no: identifier };

    const res = await baseService.select('work_orders', {
      select: `
        id,
        work_order_no,
        order_type,
        priority,
        current_stage,
        progress_percentage,
        planned_start_date,
        target_delivery_date,
        actual_completion_date,
        quantity,
        status,
        notes,
        customer_name,
        customer:customers(id, customer_code, company_name),
        model:spindle_models(id, model_code, model_name, max_speed_rpm, rated_power_kw, rated_torque_nm, tool_interface_type),
        spindle:spindles(id, serial_number, current_stage, status, max_rpm, power_kw, torque_nm, taper_interface, balance_grade, vibration_overall_velocity_mms, clamping_force_measured_kn),
        bay:production_bays(id, code, name),
        machine:machines(id, code, name),
        lead_technician:employees(id, employee_code, first_name, last_name, designation)
      `,
      eq: filter
    });

    if (res.error || !res.data?.[0]) {
      return {
        data: null,
        error: res.error || { message: `Work order ${identifier} not found` },
        latencyMs: res.latencyMs
      };
    }

    const wo = res.data[0];
    const techName = wo.lead_technician 
      ? `${wo.lead_technician.first_name} ${wo.lead_technician.last_name}`.trim()
      : 'V. R. Kulkarni';

    const normalized = {
      id: wo.work_order_no,
      dbId: wo.id,
      workOrderNo: wo.work_order_no,
      spindleSerial: wo.spindle?.serial_number || 'GPS-2026-0842',
      spindleId: wo.spindle?.id,
      spindleModel: wo.model?.model_code || 'GPS-HSK-A63-24K',
      customer: wo.customer?.company_name || wo.customer_name || 'Tata Advanced Systems Ltd',
      currentStage: (wo.current_stage || 'machining').toLowerCase(),
      shopBay: wo.bay?.name || 'Bay 2 - Studer CNC Cylindrical Grinding',
      assignedOperator: techName,
      priority: wo.priority || 'High',
      dueDate: wo.target_delivery_date || '2026-03-05',
      plannedStart: wo.planned_start_date,
      progress: wo.progress_percentage || 45,
      status: wo.status || 'In Progress',
      totalOps: 8,
      completedOps: Math.round(((wo.progress_percentage || 0) / 100) * 8),
      value: '₹8,45,000',
      specifications: {
        maxSpeed: wo.spindle?.max_rpm ? `${wo.spindle.max_rpm.toLocaleString()} RPM` : (wo.model?.max_speed_rpm ? `${wo.model.max_speed_rpm.toLocaleString()} RPM` : '24,000 RPM'),
        ratedPower: wo.spindle?.power_kw ? `${wo.spindle.power_kw} kW (S1 continuous)` : `${wo.model?.rated_power_kw || 15.0} kW`,
        torque: wo.spindle?.torque_nm ? `${wo.spindle.torque_nm} Nm` : `${wo.model?.rated_torque_nm || 32} Nm`,
        toolTaper: wo.spindle?.taper_interface || wo.model?.tool_interface_type || 'HSK-A63 DIN 69893',
        taperRunoutLimit: '≤ 0.0010 mm',
        arborRunoutLimit: '≤ 0.0030 mm @ 300mm',
        drawbarForce: wo.spindle?.clamping_force_measured_kn ? `${wo.spindle.clamping_force_measured_kn} kN` : '18.0 kN ± 1.0',
        bearingArrangement: 'Triplex Tandem Front / Duplex Back-to-Back Rear'
      }
    };

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Fetch routing steps / traveler operations for a specific work order
   */
  async getWorkOrderItems(workOrderId) {
    // If passed a business code like WO-2026-104, resolve to UUID first
    let woId = workOrderId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workOrderId);
    if (!isUuid) {
      const woRes = await baseService.select('work_orders', {
        select: 'id',
        eq: { work_order_no: workOrderId }
      });
      if (woRes.data?.[0]) woId = woRes.data[0].id;
    }

    const res = await baseService.select('work_order_items', {
      select: `
        id,
        sequence_no,
        step_name,
        estimated_mins,
        actual_mins,
        status,
        qc_sign_off,
        completed_at,
        bay:production_bays(id, code, name),
        machine:machines(id, code, name),
        assigned_employee:employees(id, employee_code, first_name, last_name)
      `,
      eq: { work_order_id: woId },
      orderBy: 'sequence_no',
      ascending: true
    });

    if (res.error) return res;

    const normalized = (res.data || []).map(item => {
      const opName = item.assigned_employee 
        ? `${item.assigned_employee.first_name[0]}. ${item.assigned_employee.last_name}`
        : 'Tech Lead';

      return {
        id: item.sequence_no,
        dbId: item.id,
        name: item.step_name,
        machine: item.bay?.name || item.machine?.name || `Bay ${item.sequence_no}`,
        operator: opName,
        status: item.status === 'Pending' ? 'Upcoming' : item.status,
        date: item.completed_at ? new Date(item.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `Est. Stage ${item.sequence_no}`,
        qcSignOff: item.qc_sign_off
      };
    });

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Create a new Work Order and generate default sequential traveler operations
   */
  async createWorkOrder(data) {
    const woNo = data.work_order_no || `WO-2026-${Math.floor(100 + Math.random() * 900)}`;
    
    // Resolve foreign keys if provided as codes
    let modelId = data.model_id;
    if (!modelId && data.spindleModel) {
      const mRes = await baseService.select('spindle_models', {
        select: 'id',
        eq: { model_code: data.spindleModel }
      });
      modelId = mRes.data?.[0]?.id;
    }

    let customerId = data.customer_id;
    if (!customerId && data.customer) {
      const cRes = await baseService.select('customers', {
        select: 'id',
        ilike: { company_name: `%${data.customer}%` }
      });
      customerId = cRes.data?.[0]?.id;
    }

    const payload = {
      work_order_no: woNo,
      model_id: modelId,
      customer_id: customerId,
      customer_name: data.customer || 'Enterprise Client',
      order_type: data.order_type || 'New Spindle Build',
      priority: data.priority || 'High',
      current_stage: data.initialStage || 'material',
      progress_percentage: 0,
      target_delivery_date: data.dueDate || new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      planned_start_date: new Date().toISOString().split('T')[0],
      quantity: data.quantity || 1,
      status: 'Planned',
      notes: data.notes || `Order initialized via shop floor management.`
    };

    const insertRes = await baseService.insert('work_orders', payload);
    if (insertRes.error || !insertRes.data?.[0]) return insertRes;

    const newWo = insertRes.data[0];

    // Seed default 8-stage traveler routing items
    const stages = [
      'Raw Bar Stock Cutting & Stress Relieving',
      'CNC Rough Turning & Deep Hole Gun Drilling',
      'Case Carburizing & Cryogenic Tempering',
      'Cylindrical Grinding of Bearing Journals',
      'Class 1000 Cleanroom Bearing Assembly',
      'Dynamic Balancing to ISO 1940 Grade G0.4',
      '4-Hour Dynamic Run-in & Thermal Stabilization',
      'Final QC Air Gauging, Micron Inspection & Packing'
    ];

    const itemsToInsert = stages.map((st, idx) => ({
      work_order_id: newWo.id,
      sequence_no: idx + 1,
      step_name: st,
      estimated_mins: 90,
      actual_mins: 0,
      status: idx === 0 ? 'In Progress' : 'Pending',
      qc_sign_off: false
    }));

    await baseService.insert('work_order_items', itemsToInsert);

    return {
      ...insertRes,
      data: {
        ...newWo,
        id: newWo.work_order_no,
        spindleSerial: data.serial || `GPS-${newWo.work_order_no.replace('WO-', '')}`,
        spindleModel: data.spindleModel,
        customer: data.customer
      }
    };
  },

  /**
   * Advance or sign off a work order item operation
   */
  async advanceWorkOrderItem(itemId, nextStatus = 'Completed') {
    const updatePayload = {
      status: nextStatus,
      qc_sign_off: nextStatus === 'Completed',
      completed_at: nextStatus === 'Completed' ? new Date().toISOString() : null
    };

    return await baseService.update('work_order_items', itemId, updatePayload);
  },

  /**
   * Update work order progress and status
   */
  async updateWorkOrderStatus(id, status, progress = null) {
    const updatePayload = { status };
    if (progress !== null) updatePayload.progress_percentage = progress;
    return await baseService.update('work_orders', id, updatePayload);
  }
};

export default workOrderService;
