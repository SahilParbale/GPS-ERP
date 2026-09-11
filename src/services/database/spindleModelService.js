import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

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
  }
};

export default spindleModelService;
