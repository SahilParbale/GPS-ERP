import { supabase } from '../supabase/supabaseClient';
import { baseService, normalizeDatabaseError } from '../database/baseService';

/**
 * Quality & Metrology Domain Service
 * 
 * Provides database queries and mutations for:
 * - Metrology Inspections (public.inspections)
 * - Measurement Checkpoint Results (public.inspection_results)
 * - Quality Approval & Rework Sign-off Workflows
 * - Audit Trail Logging (public.audit_logs)
 */
export const qualityService = {
  /**
   * List all inspections with joined spindle, spindle model, work order, and inspector details
   * @param {object} [options]
   */
  async listInspections(options = {}) {
    const start = performance.now();
    try {
      let query = supabase
        .from('inspections')
        .select(`
          id,
          inspection_number,
          spindle_id,
          work_order_id,
          inspection_type,
          inspector_id,
          inspection_date,
          overall_result,
          approval_status,
          ambient_temp_celsius,
          gauge_equipment_used,
          remarks,
          created_at,
          updated_at,
          spindle:spindles(
            id, 
            serial_number, 
            model:spindle_models(id, model_name, model_code)
          ),
          work_order:work_orders(
            id, 
            work_order_no, 
            customer_name
          ),
          inspector:employees(
            id, 
            first_name, 
            last_name, 
            designation
          )
        `)
        .order('inspection_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('approval_status', options.status);
      }
      if (options.result) {
        query = query.eq('overall_result', options.result);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error, count } = await query;
      const latencyMs = Math.round(performance.now() - start);

      if (error) {
        const normalized = normalizeDatabaseError(error);
        console.warn('[GPS-ERP Quality] listInspections error:', normalized.message);
        return { data: [], error: normalized, count: 0, latencyMs };
      }

      return { data: data || [], error: null, count: count ?? (data?.length || 0), latencyMs };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      const normalized = normalizeDatabaseError(err);
      console.warn('[GPS-ERP Quality] listInspections exception:', normalized.message);
      return { data: [], error: normalized, count: 0, latencyMs };
    }
  },

  /**
   * Get single inspection by ID
   * @param {string} id - Inspection UUID
   */
  async getInspection(id) {
    if (!id) return { data: null, error: { message: 'Inspection ID is required' } };

    const start = performance.now();
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          id,
          inspection_number,
          spindle_id,
          work_order_id,
          inspection_type,
          inspector_id,
          inspection_date,
          overall_result,
          approval_status,
          ambient_temp_celsius,
          gauge_equipment_used,
          remarks,
          created_at,
          updated_at,
          spindle:spindles(
            id, 
            serial_number, 
            model:spindle_models(id, model_name, model_code)
          ),
          work_order:work_orders(
            id, 
            work_order_no, 
            customer_name
          ),
          inspector:employees(
            id, 
            first_name, 
            last_name, 
            designation
          )
        `)
        .eq('id', id)
        .single();

      const latencyMs = Math.round(performance.now() - start);

      if (error) {
        const normalized = normalizeDatabaseError(error);
        return { data: null, error: normalized, latencyMs };
      }

      return { data, error: null, latencyMs };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      const normalized = normalizeDatabaseError(err);
      return { data: null, error: normalized, latencyMs };
    }
  },

  /**
   * Get inspection with all metrology parameter results (inspection_results)
   * @param {string} id - Inspection UUID
   */
  async getInspectionWithResults(id) {
    if (!id) return { data: null, error: { message: 'Inspection ID is required' } };

    const start = performance.now();
    try {
      // 1. Fetch inspection header with relations
      const inspectionRes = await this.getInspection(id);
      if (inspectionRes.error || !inspectionRes.data) {
        return inspectionRes;
      }

      // 2. Fetch discrete checkpoint results
      const { data: results, error: resultsError } = await supabase
        .from('inspection_results')
        .select(`
          id,
          inspection_id,
          parameter_name,
          nominal_value,
          tolerance_min,
          tolerance_max,
          measured_value,
          unit_of_measure,
          result_status,
          notes,
          created_at
        `)
        .eq('inspection_id', id)
        .order('created_at', { ascending: true });

      const latencyMs = Math.round(performance.now() - start);

      if (resultsError) {
        const normalized = normalizeDatabaseError(resultsError);
        console.warn('[GPS-ERP Quality] getInspectionWithResults results error:', normalized.message);
        return { data: null, error: normalized, latencyMs };
      }

      return {
        data: {
          ...inspectionRes.data,
          results: results || [],
          parameters: results || []
        },
        error: null,
        latencyMs
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      const normalized = normalizeDatabaseError(err);
      return { data: null, error: normalized, latencyMs };
    }
  },

  /**
   * Create a new inspection record
   * @param {object} data
   */
  async createInspection(data) {
    const res = await baseService.insert('inspections', data);
    if (!res.error && res.data?.[0]) {
      await this.logQualityAudit({
        action: 'INSERT',
        record_id: res.data[0].id,
        summary_message: `Created Quality Inspection ${res.data[0].inspection_number || ''}`,
        new_values: res.data[0]
      });
    }
    return res;
  },

  /**
   * Update an existing inspection header
   * @param {string} id
   * @param {object} data
   */
  async updateInspection(id, data) {
    const res = await baseService.update('inspections', id, data);
    if (!res.error && res.data?.[0]) {
      await this.logQualityAudit({
        action: 'UPDATE',
        record_id: id,
        summary_message: `Updated Quality Inspection ${res.data[0].inspection_number || id}`,
        new_values: data
      });
    }
    return res;
  },

  /**
   * Create a new inspection checkpoint result
   * @param {object} data
   */
  async createInspectionResult(data) {
    const res = await baseService.insert('inspection_results', data);
    if (!res.error && res.data?.[0]) {
      await this.logQualityAudit({
        action: 'INSERT',
        record_id: res.data[0].id,
        summary_message: `Added measurement checkpoint "${res.data[0].parameter_name}" for Inspection ${res.data[0].inspection_id}`,
        new_values: res.data[0]
      });
    }
    return res;
  },

  /**
   * Save / update a discrete measurement result
   * @param {string} id - inspection_results.id
   * @param {object} data - { measured_value, notes, result_status }
   */
  async updateInspectionResult(id, data) {
    if (!id) return { data: null, error: { message: 'Checkpoint ID is required' } };

    // Validate numeric measurement if provided
    const payload = {};
    if (data.measured_value !== undefined && data.measured_value !== null) {
      const numVal = Number(data.measured_value);
      if (isNaN(numVal)) {
        return { data: null, error: { message: 'Measured value must be a valid number.' } };
      }
      payload.measured_value = numVal;
    }

    if (data.notes !== undefined) {
      payload.notes = data.notes;
    }

    if (data.result_status !== undefined) {
      const validStatuses = ['Pass', 'Fail', 'Warning'];
      if (!validStatuses.includes(data.result_status)) {
        return { data: null, error: { message: `Result status must be one of: ${validStatuses.join(', ')}` } };
      }
      payload.result_status = data.result_status;
    }

    try {
      const { data: updated, error } = await supabase
        .from('inspection_results')
        .update(payload)
        .eq('id', id)
        .select();

      if (error) {
        const normalized = normalizeDatabaseError(error);
        return { data: null, error: normalized };
      }

      // Record audit event
      if (updated && updated[0]) {
        await this.logQualityAudit({
          action: 'UPDATE',
          table_name: 'inspection_results',
          record_id: id,
          summary_message: `Updated measurement for "${updated[0].parameter_name}": ${updated[0].measured_value} ${updated[0].unit_of_measure || ''} (${updated[0].result_status})`,
          new_values: payload
        });
      }

      return { data: updated, error: null };
    } catch (err) {
      const normalized = normalizeDatabaseError(err);
      return { data: null, error: normalized };
    }
  },

  /**
   * Approve inspection sign-off and mark overall result as Pass
   * @param {string} id - Inspection UUID
   * @param {object} [options] - { remarks, inspectorName }
   */
  async approveInspection(id, options = {}) {
    if (!id) return { data: null, error: { message: 'Inspection ID is required' } };

    const updatePayload = {
      approval_status: 'Approved',
      overall_result: 'Pass',
      updated_at: new Date().toISOString()
    };

    if (options.remarks !== undefined) {
      updatePayload.remarks = options.remarks;
    }

    try {
      const { data: updated, error } = await supabase
        .from('inspections')
        .update(updatePayload)
        .eq('id', id)
        .select(`
          id,
          inspection_number,
          overall_result,
          approval_status,
          remarks,
          updated_at
        `);

      if (error) {
        const normalized = normalizeDatabaseError(error);
        return { data: null, error: normalized };
      }

      const inspNumber = updated?.[0]?.inspection_number || id;
      await this.logQualityAudit({
        action: 'APPROVE',
        record_id: id,
        summary_message: `QC Certificate approved and digitally signed by QA Lead for ${inspNumber}`,
        new_values: updatePayload
      });

      return { data: updated, error: null };
    } catch (err) {
      const normalized = normalizeDatabaseError(err);
      return { data: null, error: normalized };
    }
  },

  /**
   * Request rework for an inspection and mark overall result as Rework Required
   * @param {string} id - Inspection UUID
   * @param {object} [options] - { remarks, inspectorName }
   */
  async requestRework(id, options = {}) {
    if (!id) return { data: null, error: { message: 'Inspection ID is required' } };

    const updatePayload = {
      approval_status: 'Rejected',
      overall_result: 'Rework Required',
      updated_at: new Date().toISOString()
    };

    if (options.remarks !== undefined) {
      updatePayload.remarks = options.remarks;
    }

    try {
      const { data: updated, error } = await supabase
        .from('inspections')
        .update(updatePayload)
        .eq('id', id)
        .select(`
          id,
          inspection_number,
          overall_result,
          approval_status,
          remarks,
          updated_at
        `);

      if (error) {
        const normalized = normalizeDatabaseError(error);
        return { data: null, error: normalized };
      }

      const inspNumber = updated?.[0]?.inspection_number || id;
      await this.logQualityAudit({
        action: 'REJECT',
        record_id: id,
        summary_message: `Inspection ${inspNumber} flagged for rework / regrinding`,
        new_values: updatePayload
      });

      return { data: updated, error: null };
    } catch (err) {
      const normalized = normalizeDatabaseError(err);
      return { data: null, error: normalized };
    }
  },

  /**
   * Log an immutable event to public.audit_logs
   * Uses direct insert without select (since RLS allows INSERT to authenticated, while SELECT is management-only)
   * @param {object} event
   */
  async logQualityAudit(event = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Silent return if no authenticated session

      const auditRecord = {
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'QA Inspector',
        user_email: user.email,
        action: event.action || 'UPDATE',
        module: 'Quality',
        table_name: event.table_name || 'inspections',
        record_id: String(event.record_id || ''),
        summary_message: event.summary_message || 'Quality record updated',
        previous_values: event.previous_values || null,
        new_values: event.new_values || null
      };

      // Note: do not chain .select() because p_audit_select requires management role
      await supabase.from('audit_logs').insert(auditRecord);
    } catch (err) {
      // Audit log failures must never break the main operational flow
      console.warn('[GPS-ERP Quality] Audit logging non-blocking notice:', err.message);
    }
  }
};

export default qualityService;
