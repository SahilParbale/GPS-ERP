import { baseService } from './baseService.js';
import { supabase } from '../supabase/supabaseClient.js';

/**
 * Spindle Model & Fleet Domain Service
 * Provides queries and mutations for Spindle Engineering Models, Serialized Spindle Fleet Assets,
 * Fitted BOM Components, and Metrology Quality Records.
 */
export const spindleModelService = {
  /**
   * Fetch all spindle engineering models
   */
  async getSpindleModels(options = {}) {
    return await baseService.select('spindle_models', {
      orderBy: options.orderBy || 'model_code',
      ascending: options.ascending ?? true,
      ...options
    });
  },

  /**
   * Fetch a spindle model by model_code
   */
  async getModelByCode(modelCode) {
    const res = await baseService.select('spindle_models', {
      eq: { model_code: modelCode }
    });
    return {
      data: res.data?.[0] || null,
      error: res.error,
      latencyMs: res.latencyMs
    };
  },

  /**
   * Fetch serialized fleet spindles with model and customer joins
   */
  async getSpindles(options = {}) {
    const res = await baseService.select('spindles', {
      select: `
        id,
        serial_number,
        status,
        max_rpm,
        power_kw,
        torque_nm,
        taper_interface,
        lubrication,
        bearings_spec,
        cooling_spec,
        spindle_type,
        customer_name,
        warranty_period,
        current_stage,
        current_location,
        max_runout_measured_microns,
        balance_grade,
        vibration_overall_velocity_mms,
        thermal_rise_stabilized_celsius,
        clamping_force_measured_kn,
        qr_code,
        notes,
        model:spindle_models(id, model_code, model_name, spindle_type),
        customer:customers(id, customer_code, company_name)
      `,
      orderBy: options.orderBy || 'serial_number',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    const normalized = (res.data || []).map(sp => ({
      id: sp.id,
      dbId: sp.id,
      serialNumber: sp.serial_number,
      model: sp.model?.model_code || sp.model_code || 'GPS-HSK-A63-24K',
      modelName: sp.model?.model_name || 'Precision Motorized Spindle',
      type: sp.spindle_type || sp.model?.spindle_type || 'Motorized Built-in',
      customer: sp.customer?.company_name || sp.customer_name || 'Enterprise Client',
      rpm: `${sp.max_rpm ? (sp.max_rpm / 1000).toFixed(0) : '24'}k RPM`,
      maxRpm: sp.max_rpm || 24000,
      power: `${sp.power_kw || 15} kW`,
      torque: `${sp.torque_nm || 32} Nm`,
      taper: sp.taper_interface || 'HSK-A63',
      interface: sp.taper_interface || 'HSK-A63',
      lubrication: sp.lubrication || 'Air-Oil Mist',
      bearings: sp.bearings_spec || 'Ceramic Hybrid',
      cooling: sp.cooling_spec || 'Water-Glycol Closed Circuit',
      status: sp.status || 'In Production',
      stage: sp.current_stage || 'Machining',
      warranty: sp.warranty_period || 'Active (24 Months)',
      qrCode: sp.qr_code || sp.serial_number,
      runout: sp.max_runout_measured_microns ? `${sp.max_runout_measured_microns} µm` : '0.6 µm',
      runoutTaper: sp.max_runout_measured_microns ? `${sp.max_runout_measured_microns} mm` : '0.0008 mm',
      balanceGrade: sp.balance_grade || 'ISO 1940 G0.28',
      vibration: sp.vibration_overall_velocity_mms ? `${sp.vibration_overall_velocity_mms} mm/s` : '0.27 mm/s',
      vibrationRms: sp.vibration_overall_velocity_mms ? `${sp.vibration_overall_velocity_mms} mm/s` : '0.27 mm/s',
      tempRise: sp.thermal_rise_stabilized_celsius ? `${sp.thermal_rise_stabilized_celsius} °C` : '14.2 °C',
      clampForce: sp.clamping_force_measured_kn ? `${sp.clamping_force_measured_kn} kN` : '18.4 kN'
    }));

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Fetch single spindle with detailed specifications
   */
  async getSpindleBySerial(serialNumber) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serialNumber);
    const filter = isUuid ? { id: serialNumber } : { serial_number: serialNumber };

    const res = await baseService.select('spindles', {
      select: `
        id, serial_number, model_id, model_code, customer_id, customer_name,
        spindle_type, max_rpm, power_kw, torque_nm, taper_interface,
        lubrication, bearings_spec, cooling_spec, manufacturing_date,
        warranty_period, status, current_stage, current_location,
        max_runout_measured_microns, balance_grade, vibration_overall_velocity_mms,
        thermal_rise_stabilized_celsius, clamping_force_measured_kn, qr_code, notes,
        model:spindle_models(id, model_code, model_name, spindle_type),
        customer:customers(id, customer_code, company_name)
      `,
      eq: filter
    });

    if (res.error || !res.data?.[0]) {
      return {
        data: null,
        error: res.error || { message: `Spindle ${serialNumber} not found` },
        latencyMs: res.latencyMs
      };
    }

    const sp = res.data[0];
    const normalized = {
      id: sp.id,
      serialNumber: sp.serial_number,
      model: sp.model?.model_code || sp.model_code || 'GPS-HSK-A63-24K',
      modelName: sp.model?.model_name || 'Precision Motorized Spindle',
      type: sp.spindle_type || sp.model?.spindle_type || 'Motorized Electro-Spindle',
      customer: sp.customer?.company_name || sp.customer_name || 'Enterprise Client',
      rpm: `${sp.max_rpm ? (sp.max_rpm / 1000).toFixed(0) : '24'}k RPM`,
      maxRpm: sp.max_rpm || 24000,
      power: `${sp.power_kw || 15} kW`,
      torque: `${sp.torque_nm || 32} Nm`,
      interface: sp.taper_interface || 'HSK-A63',
      lubrication: sp.lubrication || 'Air-Oil Mist',
      bearings: sp.bearings_spec || 'Ceramic Hybrid (HC7008-E)',
      cooling: sp.cooling_spec || 'Water-Glycol Closed Circuit',
      status: sp.status || 'In Production',
      stage: sp.current_stage || 'Machining',
      manufacturingDate: sp.manufacturing_date || '2026-02-18',
      warranty: sp.warranty_period || 'Active (24 Months / 4,000h)',
      runoutTaper: sp.max_runout_measured_microns ? `${sp.max_runout_measured_microns} mm` : '0.0008 mm',
      balanceGrade: sp.balance_grade || 'ISO 1940 G0.28',
      vibrationRms: sp.vibration_overall_velocity_mms ? `${sp.vibration_overall_velocity_mms} mm/s` : '0.27 mm/s',
      tempRise: sp.thermal_rise_stabilized_celsius ? `${sp.thermal_rise_stabilized_celsius} °C` : '14.2 °C',
      clampForce: sp.clamping_force_measured_kn ? `${sp.clamping_force_measured_kn} kN` : '18.4 kN',
      qrCode: sp.qr_code || sp.serial_number
    };

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Fetch BOM components fitted to a specific spindle
   */
  async getSpindleComponents(spindleId) {
    let targetId = spindleId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(spindleId);
    if (!isUuid) {
      const spRes = await baseService.select('spindles', {
        select: 'id',
        eq: { serial_number: spindleId }
      });
      if (spRes.data?.[0]) targetId = spRes.data[0].id;
    }

    const res = await baseService.select('spindle_components', {
      select: `
        id, component_name, part_number, sub_supplier, serial_lot_no,
        tolerance_fitted_microns, installed_at,
        installed_by_user:employees(id, employee_code, first_name, last_name)
      `,
      eq: { spindle_id: targetId }
    });

    if (res.error) return res;

    const normalized = (res.data || []).map(c => ({
      partNo: c.part_number,
      name: c.component_name,
      supplier: c.sub_supplier,
      batch: c.serial_lot_no,
      tolerance: `${c.tolerance_fitted_microns || 0.8} µm`,
      status: 'Fitted'
    }));

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Fetch quality test parameters for a spindle
   */
  async getSpindleQualityRecords(spindleId) {
    let targetId = spindleId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(spindleId);
    if (!isUuid) {
      const spRes = await baseService.select('spindles', {
        select: 'id',
        eq: { serial_number: spindleId }
      });
      if (spRes.data?.[0]) targetId = spRes.data[0].id;
    }

    const res = await baseService.select('spindle_quality_records', {
      select: `
        id, test_parameter, specified_value, measured_value,
        unit_of_measure, tolerance_band, passed, tested_at,
        inspector:employees(id, employee_code, first_name, last_name)
      `,
      eq: { spindle_id: targetId }
    });

    if (res.error) return res;

    const normalized = (res.data || []).map(q => ({
      parameter: q.test_parameter,
      specified: `${q.specified_value} ${q.unit_of_measure}`,
      measured: `${q.measured_value} ${q.unit_of_measure}`,
      tolerance: q.tolerance_band,
      passed: q.passed,
      inspector: q.inspector ? `${q.inspector.first_name} ${q.inspector.last_name}` : 'QC Lead'
    }));

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Update spindle operational status
   */
  async updateSpindleStatus(id, status) {
    return await baseService.update('spindles', id, { status });
  },

  /**
   * Log an event to public.audit_logs (Non-blocking)
   */
  async logSpindleAudit(event = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const auditRecord = {
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Manufacturing User',
        user_email: user.email,
        action: event.action || 'CREATE',
        module: 'Manufacturing',
        table_name: event.table_name || 'spindles',
        record_id: String(event.record_id || ''),
        summary_message: event.summary_message || 'Spindle registration event',
        previous_values: event.previous_values || null,
        new_values: event.new_values || null
      };

      await supabase.from('audit_logs').insert(auditRecord);
    } catch (err) {
      console.warn('[GPS-ERP Spindles] Audit logging non-blocking notice:', err.message);
    }
  },

  /**
   * Suggest next sequential serial number (Convenience helper only).
   * PostgreSQL UNIQUE(serial_number) remains the authoritative duplicate protection.
   */
  async getNextSuggestedSerial() {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `GPS-${currentYear}-`;
      const { data, error } = await supabase
        .from('spindles')
        .select('serial_number')
        .like('serial_number', `${prefix}%`);

      if (error || !data || data.length === 0) {
        return `${prefix}0850`;
      }

      let maxSeq = 840;
      for (const row of data) {
        const numPart = row.serial_number?.replace(prefix, '');
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }

      return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
    } catch {
      return `GPS-${new Date().getFullYear()}-0850`;
    }
  },

  /**
   * Register a new manufactured spindle into public.spindles
   * Uses live schema columns:
   * - serial_number (UNIQUE NOT NULL)
   * - model_id (FK to spindle_models)
   * - customer_id (FK to customers)
   * - technical specs mapped from spindle_models:
   *   spindle_type, max_rpm, power_kw, torque_nm, taper_interface,
   *   lubrication, bearings_spec, cooling_spec, clamping_force_measured_kn,
   *   max_runout_measured_microns
   */
  async registerSpindle(spindleData) {
    if (!spindleData.serial_number?.trim()) {
      return { data: null, error: { message: 'Serial number is required' } };
    }
    if (!spindleData.model_id) {
      return { data: null, error: { message: 'Spindle model selection is required' } };
    }

    const trimmedSerial = spindleData.serial_number.trim();

    try {
      // 1. Check duplicate serial number pre-validation
      const { data: existing } = await supabase
        .from('spindles')
        .select('id, serial_number')
        .eq('serial_number', trimmedSerial)
        .maybeSingle();

      if (existing) {
        return {
          data: null,
          error: {
            code: '23505',
            message: `Spindle with serial number '${trimmedSerial}' is already registered.`
          }
        };
      }

      // 2. Fetch engineering model specifications from public.spindle_models
      const { data: model, error: modelErr } = await supabase
        .from('spindle_models')
        .select('*')
        .eq('id', spindleData.model_id)
        .single();

      if (modelErr || !model) {
        return { data: null, error: { message: `Invalid spindle model ID: ${spindleData.model_id}` } };
      }

      // 3. Resolve customer details if customer_id provided
      let customerName = spindleData.customer_name || null;
      if (spindleData.customer_id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('id, company_name')
          .eq('id', spindleData.customer_id)
          .single();
        if (cust?.company_name) {
          customerName = cust.company_name;
        }
      }

      // Valid statuses according to CHECK constraint on public.spindles
      const VALID_STATUSES = [
        'In Production', 'Testing', 'QC Passed', 'QC Pending',
        'Ready', 'Dispatched', 'In Service', 'Under Maintenance', 'Decommissioned'
      ];
      const validStatus = VALID_STATUSES.includes(spindleData.status)
        ? spindleData.status
        : 'In Production';

      // 4. Construct authoritative insert payload matching live schema
      const insertPayload = {
        serial_number: trimmedSerial,
        model_id: model.id,
        model_code: model.model_code,
        customer_id: spindleData.customer_id || null,
        customer_name: customerName,
        spindle_type: model.spindle_type,
        max_rpm: model.max_rpm,
        power_kw: model.rated_power_kw,
        torque_nm: model.nominal_torque_nm,
        taper_interface: model.taper_standard,
        lubrication: model.lubrication_type,
        bearings_spec: model.bearing_type,
        cooling_spec: model.cooling_type,
        clamping_force_measured_kn: model.clamping_retention_force_kn,
        max_runout_measured_microns: model.runout_taper_microns,
        manufacturing_date: spindleData.manufacturing_date || new Date().toISOString().split('T')[0],
        warranty_period: spindleData.warranty_period || 'Active (24 Months / 4,000h)',
        status: validStatus,
        current_stage: spindleData.current_stage || 'Machining',
        current_location: spindleData.current_location || 'Pune Plant 1',
        qr_code: `${trimmedSerial}-${model.model_code}`,
        notes: spindleData.notes?.trim() || null
      };

      // 5. Insert into public.spindles
      const { data, error } = await supabase
        .from('spindles')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return {
            data: null,
            error: {
              code: '23505',
              message: `Spindle with serial number '${trimmedSerial}' is already registered (PostgreSQL unique constraint violation).`
            }
          };
        }
        return { data: null, error };
      }

      // 6. Log audit event
      await this.logSpindleAudit({
        action: 'CREATE',
        table_name: 'spindles',
        record_id: data.id,
        summary_message: `Registered new spindle ${trimmedSerial} (${model.model_code})`,
        new_values: insertPayload
      });

      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message || 'Failed to register spindle' } };
    }
  },

  /**
   * Delete a spindle (Used for test cleanup / rollback)
   */
  async deleteSpindle(id) {
    if (!id) return { data: null, error: 'Spindle ID is required' };

    try {
      const { data: current } = await supabase
        .from('spindles')
        .select('id, serial_number')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('spindles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await this.logSpindleAudit({
        action: 'DELETE',
        table_name: 'spindles',
        record_id: id,
        summary_message: `Deleted spindle ${current?.serial_number || id}`,
        previous_values: current
      });

      return { data: { success: true }, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to delete spindle' };
    }
  }
};

export default spindleModelService;
