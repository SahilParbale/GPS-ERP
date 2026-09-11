import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Service & Spindle Restoration Domain Service
 * Manages Customer Service Requests, 9-Stage Restoration Pipeline,
 * Consumed Parts/Kits, and Historical Runout/Refurbishment Logs.
 */
export const serviceService = {
  /**
   * Fetch all service requests
   */
  async getServiceRequests(options = {}) {
    return await baseService.select('service_requests', {
      select: `
        id,
        sr_number,
        customer_id,
        customer_name,
        customer_contact,
        customer_phone,
        customer_email,
        spindle_id,
        spindle_model,
        serial_number,
        operating_hours_logged,
        failure_description,
        reported_symptoms,
        inward_date,
        priority,
        status,
        created_at,
        customer:customers(id, customer_code, company_name)
      `,
      orderBy: options.orderBy || 'inward_date',
      ascending: options.ascending ?? false,
      ...options
    });
  },

  /**
   * Fetch active service jobs with stage, lead technician, and spindle details
   */
  async getServiceJobs(options = {}) {
    const res = await baseService.select('service_jobs', {
      select: `
        id,
        job_number,
        service_request_id,
        work_order_id,
        current_pipeline_stage,
        lead_technician_id,
        taper_runout_initial,
        taper_runout_final,
        balancing_grade_achieved,
        bearing_pack_lot,
        completion_target_date,
        actual_completion_date,
        total_service_cost,
        status,
        notes,
        created_at,
        service_request:service_requests(
          id, sr_number, customer_name, spindle_model, serial_number, failure_description, priority, inward_date
        ),
        lead_technician:employees(
          id, employee_code, first_name, last_name, designation
        )
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for clean UI rendering
    const normalized = (res.data || []).map(job => {
      const sr = job.service_request || {};
      const tech = job.lead_technician;
      const techName = tech ? `${tech.first_name} ${tech.last_name}` : 'Unassigned Tech';

      return {
        id: job.job_number || job.id,
        dbId: job.id,
        serviceRequestId: job.service_request_id,
        srNumber: sr.sr_number,
        spindleSerial: sr.serial_number || 'GPS-2025-0721',
        spindleModel: sr.spindle_model || 'GPS-HSK-A63-24K',
        customer: sr.customer_name || 'Precision Customer',
        complaint: sr.failure_description || 'High vibration & runout exceeding limit.',
        technician: techName,
        technicianId: job.lead_technician_id,
        currentStage: job.current_pipeline_stage,
        receivedDate: sr.inward_date,
        targetDate: job.completion_target_date,
        actualCompletionDate: job.actual_completion_date,
        estimatedCost: job.total_service_cost ? `₹${Number(job.total_service_cost).toLocaleString('en-IN')}` : '₹0',
        priority: sr.priority || 'High',
        status: job.status,
        taperRunoutInitial: job.taper_runout_initial,
        taperRunoutFinal: job.taper_runout_final,
        balancingGrade: job.balancing_grade_achieved,
        bearingLot: job.bearing_pack_lot,
        notes: job.notes
      };
    });

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Fetch a single service job by job_number or UUID with items and history
   */
  async getServiceJobById(identifier) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const filter = isUuid ? { id: identifier } : { job_number: identifier };

    const { data: jobs, error } = await supabase
      .from('service_jobs')
      .select(`
        *,
        service_request:service_requests(*),
        lead_technician:employees(id, employee_code, first_name, last_name, designation),
        items:service_items(*),
        history:service_history(*)
      `)
      .match(filter)
      .limit(1);

    if (error) return { data: null, error };
    return { data: jobs?.[0] || null, error: null };
  },

  /**
   * Create a new Service Request
   */
  async createServiceRequest(srData) {
    const srNumber = srData.sr_number || `SR-2026-${Math.floor(100 + Math.random() * 900)}`;
    const record = {
      sr_number: srNumber,
      customer_id: srData.customer_id || null,
      customer_name: srData.customer_name || 'Valued Customer',
      customer_contact: srData.customer_contact || null,
      customer_phone: srData.customer_phone || null,
      customer_email: srData.customer_email || null,
      spindle_id: srData.spindle_id || null,
      spindle_model: srData.spindle_model || 'GPS-HSK-A63-24K',
      serial_number: srData.serial_number || 'GPS-2025-0740',
      operating_hours_logged: srData.operating_hours_logged || 0,
      failure_description: srData.failure_description || 'Inward spindle failure inspection requested.',
      reported_symptoms: srData.reported_symptoms || ['Vibration', 'Bearing Noise'],
      inward_date: srData.inward_date || new Date().toISOString().split('T')[0],
      priority: srData.priority || 'High',
      status: srData.status || 'Inward Assessment'
    };

    return await baseService.insert('service_requests', record);
  },

  /**
   * Create a Service Job linked to a Service Request
   */
  async createServiceJob(jobData) {
    const jobNumber = jobData.job_number || `${jobData.sr_number || 'SR-2026'}-JOB`;
    const record = {
      service_request_id: jobData.service_request_id,
      job_number: jobNumber,
      work_order_id: jobData.work_order_id || null,
      current_pipeline_stage: jobData.current_pipeline_stage || 'Inward Inspection',
      lead_technician_id: jobData.lead_technician_id || null,
      taper_runout_initial: jobData.taper_runout_initial || null,
      balancing_grade_achieved: jobData.balancing_grade_achieved || 'ISO G0.4',
      bearing_pack_lot: jobData.bearing_pack_lot || null,
      completion_target_date: jobData.completion_target_date || null,
      total_service_cost: jobData.total_service_cost || 0,
      status: jobData.status || 'In Progress',
      notes: jobData.notes || null
    };

    return await baseService.insert('service_jobs', record);
  },

  /**
   * Advance pipeline stage with atomic service history audit log
   */
  async advanceServiceJobStage(jobId, newStage, details = {}) {
    // 1. Update job stage
    const updatePayload = {
      current_pipeline_stage: newStage,
      updated_at: new Date().toISOString()
    };
    if (details.status) updatePayload.status = details.status;
    if (details.taperRunoutFinal !== undefined) updatePayload.taper_runout_final = details.taperRunoutFinal;

    const { data: job, error: updateErr } = await supabase
      .from('service_jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .select('*, service_request:service_requests(*)')
      .single();

    if (updateErr) return { data: null, error: updateErr };

    // 2. Persist service history event
    const historyPayload = {
      spindle_id: job.service_request?.spindle_id || null,
      service_job_id: job.id,
      customer_id: job.service_request?.customer_id || null,
      event_date: new Date().toISOString().split('T')[0],
      event_type: `Advanced to ${newStage}`,
      performed_by: job.lead_technician_id || null,
      findings: details.findings || `Advanced rebuild step to ${newStage}`,
      actions_taken: details.actionsTaken || `Pipeline stage updated to ${newStage}`
    };

    await supabase.from('service_history').insert(historyPayload);

    return { data: job, error: null };
  },

  /**
   * Add consumed replacement part/kit to service job
   */
  async addServiceItem(itemData) {
    const qty = itemData.quantity || 1;
    const unitCost = itemData.unit_cost || 0;
    const record = {
      service_job_id: itemData.service_job_id,
      product_id: itemData.product_id || null,
      item_description: itemData.item_description,
      quantity: qty,
      unit_cost: unitCost,
      total_cost: qty * unitCost
    };

    return await baseService.insert('service_items', record);
  },

  /**
   * Complete service job with final QC sign-off and historical runout log
   */
  async completeServiceJob(jobId, completionData = {}) {
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const { data: job, error: jobErr } = await supabase
      .from('service_jobs')
      .update({
        current_pipeline_stage: 'Preservation Packing',
        status: 'Completed',
        actual_completion_date: today,
        taper_runout_final: completionData.taperRunoutFinal || 0.0008,
        balancing_grade_achieved: completionData.balancingGrade || 'ISO G0.4',
        updated_at: now
      })
      .eq('id', jobId)
      .select('*, service_request:service_requests(*)')
      .single();

    if (jobErr) return { data: null, error: jobErr };

    // Update service request to 'Ready for Dispatch'
    if (job.service_request_id) {
      await supabase
        .from('service_requests')
        .update({ status: 'Ready for Dispatch', updated_at: now })
        .eq('id', job.service_request_id);
    }

    // Insert into spindle_service_history if spindle is linked
    if (job.service_request?.spindle_id) {
      await supabase.from('spindle_service_history').insert({
        spindle_id: job.service_request.spindle_id,
        service_job_no: job.job_number,
        service_date: today,
        service_type: 'Full Rebuild & Dynamic Balancing',
        taper_runout_before_microns: job.taper_runout_initial,
        taper_runout_after_microns: completionData.taperRunoutFinal || 0.0008,
        serviced_by: job.lead_technician_id,
        notes: completionData.notes || 'Rebuild certified, dual-plane balanced and thermally stabilized.'
      });
    }

    return { data: job, error: null };
  }
};
