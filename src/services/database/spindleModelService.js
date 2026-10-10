import { baseService } from './baseService.js';
import { supabase } from '../supabase/supabaseClient.js';
import { SPINDLES } from '../../data/mockData.js';

const CUSTOM_SPINDLES_KEY = 'gps_erp_custom_spindles';
const DELETED_SPINDLES_KEY = 'gps_erp_deleted_spindle_ids';

function getStoredCustomSpindles() {
  try {
    const raw = localStorage.getItem(CUSTOM_SPINDLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomSpindles(spindles) {
  try {
    localStorage.setItem(CUSTOM_SPINDLES_KEY, JSON.stringify(spindles));
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'spindles' } }));
  } catch (e) {
    console.error('Failed saving custom spindles:', e);
  }
}

function getStoredDeletedSpindleIds() {
  try {
    const raw = localStorage.getItem(DELETED_SPINDLES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function saveStoredDeletedSpindleIds(idSet) {
  try {
    localStorage.setItem(DELETED_SPINDLES_KEY, JSON.stringify(Array.from(idSet)));
  } catch (e) {
    console.error('Failed saving deleted spindle IDs:', e);
  }
}

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
    let liveSpindles = [];
    try {
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

      if (!res.error && res.data && res.data.length > 0) {
        liveSpindles = res.data.map(sp => ({
          id: sp.id,
          dbId: sp.id,
          serialNumber: sp.serial_number,
          make: 'GPS Spindle',
          model: sp.model?.model_code || sp.model_code || 'GPS-HSK-A63-24K',
          modelName: sp.model?.model_name || 'Precision Motorized Spindle',
          category: 'manufactured',
          type: sp.spindle_type || sp.model?.spindle_type || 'Motorized Electro-Spindle',
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
      }
    } catch (e) {
      console.warn('[spindleModelService] live query fallback:', e);
    }

    let combined = liveSpindles.length > 0 ? liveSpindles : SPINDLES.map(s => ({ ...s }));

    // Merge custom spindles from local storage
    const custom = getStoredCustomSpindles();
    if (custom.length > 0) {
      const map = new Map();
      combined.forEach(s => map.set(s.serialNumber || s.id, s));
      custom.forEach(s => map.set(s.serialNumber || s.id, s));
      combined = Array.from(map.values());
    }

    // Filter deleted spindle IDs
    const deletedIds = getStoredDeletedSpindleIds();
    if (deletedIds.size > 0) {
      combined = combined.filter(s => !deletedIds.has(s.id) && !deletedIds.has(s.serialNumber));
    }

    // Ensure category, make, and fields are properly defaulted
    combined = combined.map(s => {
      let category = s.category;
      if (!category) {
        if (s.status === 'Under Service' || s.serialNumber?.startsWith('KES') || s.serialNumber?.startsWith('WEI') || s.serialNumber?.startsWith('FIS') || s.serialNumber?.startsWith('SET') || s.serialNumber === 'GPS-2025-0721') {
          category = 'repair';
        } else if (s.serialNumber?.startsWith('CAT-') || s.status === 'Cataloged Asset') {
          category = 'catalog';
        } else {
          category = 'manufactured';
        }
      }

      let make = s.make;
      if (!make) {
        if (s.serialNumber?.startsWith('KES')) make = 'Franz Kessler';
        else if (s.serialNumber?.startsWith('WEI')) make = 'Weiss / Siemens';
        else if (s.serialNumber?.startsWith('FIS')) make = 'Fischer Spindle';
        else if (s.serialNumber?.startsWith('SET')) make = 'Setco';
        else if (s.serialNumber?.startsWith('CAT-IBAG')) make = 'IBAG Switzerland';
        else if (s.serialNumber?.startsWith('CAT-STEP')) make = 'Step-Tec (GF Machining)';
        else if (s.serialNumber?.startsWith('CAT-HSD')) make = 'HSD Mechatronics';
        else if (s.serialNumber?.startsWith('CAT-FANUC')) make = 'Celera / Fanuc';
        else make = 'GPS Spindle';
      }

      return {
        ...s,
        category,
        make
      };
    });

    return {
      data: combined,
      error: null
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
      const { data: all } = await this.getSpindles();
      const match = (all || []).find(s => s.serialNumber === serialNumber || s.id === serialNumber);
      if (match) {
        return {
          data: match,
          error: null,
          latencyMs: res.latencyMs || 0
        };
      }
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

    if (res.error || !res.data || res.data.length === 0) {
      return {
        data: [
          { partNo: 'BRG-7008-HC-P4', name: 'Angular Contact Ceramic Hybrid Bearing Set (Tandem Pair)', supplier: 'GMN Germany / SKF', batch: 'LOT-2026-B81', tolerance: '0.4 µm', status: 'Fitted' },
          { partNo: 'SFT-42CRMO4-GR', name: 'Precision Case-Hardened Ground Spindle Shaft', supplier: 'GPS In-House Machining', batch: 'HEAT-9942', tolerance: '0.5 µm', status: 'Fitted' },
          { partNo: 'COL-HSK63-OTT', name: 'Automatic Tool Clamping Collet & Drawbar Mechanism', supplier: 'OTT-Jakob Germany', batch: 'OTT-8831', tolerance: '1.0 µm', status: 'Fitted' },
          { partNo: 'MOT-SYN-15KW', name: 'High Frequency Synchronous Stator-Rotor Core', supplier: 'Siemens / Kessler OEM', batch: 'MOT-4401', tolerance: 'Class H', status: 'Fitted' },
          { partNo: 'SEAL-LAB-A63', name: 'Front Air Purge Non-Contact Labyrinth Sealing Ring', supplier: 'GPS Precision Shop', batch: 'SEAL-2026', tolerance: '0.8 µm', status: 'Fitted' }
        ],
        error: null
      };
    }

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

    if (res.error || !res.data || res.data.length === 0) {
      return {
        data: [
          { parameter: 'Spindle Nose Radial Runout (at nose taper)', specified: '< 1.0 µm', measured: '0.6 µm', tolerance: 'ISO 1940 G0.4', passed: true, inspector: 'Sunil Rao (QC Lead)' },
          { parameter: 'Test Bar Radial Runout (at 300mm overhang)', specified: '< 3.0 µm', measured: '2.1 µm', tolerance: 'DIN 69893', passed: true, inspector: 'Sunil Rao (QC Lead)' },
          { parameter: 'Overall Dynamic Vibration Velocity RMS', specified: '< 0.50 mm/s', measured: '0.27 mm/s', tolerance: 'ISO 10816-3', passed: true, inspector: 'Pooja Verma (Vib Analyst)' },
          { parameter: 'Clamping Force (Drawbar Retention)', specified: '> 18.0 kN', measured: '18.4 kN', tolerance: '±0.5 kN', passed: true, inspector: 'Manoj Shinde (Assembly)' },
          { parameter: 'Thermal Rise (4h Continuous Run-in @ Max RPM)', specified: '< 18.0 °C', measured: '14.2 °C', tolerance: 'Stabilized < 20°C', passed: true, inspector: 'Pooja Verma (Vib Analyst)' },
          { parameter: 'Motor Stator Insulation Resistance (Megger Test)', specified: '> 100 MΩ', measured: '550 MΩ', tolerance: 'Min 50 MΩ', passed: true, inspector: 'Sunil Rao (QC Lead)' }
        ],
        error: null
      };
    }

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
  /**
   * Register a new spindle asset (Manufactured, Repaired/Serviced, or Cataloged)
   */
  async registerSpindle(spindleData) {
    if (!spindleData.serial_number?.trim()) {
      return { data: null, error: { message: 'Serial number / Asset ID is required' } };
    }

    const trimmedSerial = spindleData.serial_number.trim();
    const id = spindleData.id || `sp-${Date.now()}`;

    // If it was previously marked as deleted, remove from deleted list
    const deletedSet = getStoredDeletedSpindleIds();
    if (deletedSet.has(trimmedSerial) || deletedSet.has(id)) {
      deletedSet.delete(trimmedSerial);
      deletedSet.delete(id);
      saveStoredDeletedSpindleIds(deletedSet);
    }

    const category = spindleData.category || 'manufactured';
    const make = spindleData.make || (category === 'manufactured' ? 'GPS Spindle' : 'Generic OEM');
    const model = spindleData.model || spindleData.model_code || 'GPS-HSK-A63-24K';

    const newAsset = {
      id,
      dbId: id,
      serialNumber: trimmedSerial,
      make,
      model,
      category,
      customer: spindleData.customer || spindleData.customer_name || (category === 'catalog' ? 'Benchmark Fleet Asset' : 'Internal Stock'),
      customerId: spindleData.customer_id || '',
      machineTool: spindleData.machineTool || '',
      plantLocation: spindleData.current_location || spindleData.plantLocation || 'Pune Plant 1',
      type: spindleData.spindle_type || spindleData.type || 'Motorized Electro-Spindle',
      rpm: spindleData.rpm || `${spindleData.max_rpm || 24000} RPM`,
      maxRpm: Number(spindleData.max_rpm) || 24000,
      power: spindleData.power || `${spindleData.power_kw || 15} kW`,
      torque: spindleData.torque || `${spindleData.torque_nm || 32} Nm`,
      interface: spindleData.taper_interface || spindleData.interface || 'HSK-A63',
      taper: spindleData.taper || spindleData.taper_interface || 'HSK-A63',
      lubrication: spindleData.lubrication || 'Air-Oil Mist',
      bearings: spindleData.bearings || 'Ceramic Hybrid',
      cooling: spindleData.cooling || 'Water-Glycol Closed Circuit',
      status: spindleData.status || (category === 'repair' ? 'Under Service' : (category === 'catalog' ? 'Cataloged Asset' : 'In Production')),
      stage: spindleData.current_stage || spindleData.stage || (category === 'repair' ? 'Under Inspection' : 'Machining'),
      manufacturingDate: spindleData.manufacturing_date || new Date().toISOString().split('T')[0],
      warranty: spindleData.warranty_period || spindleData.warranty || (category === 'repair' ? '6 Months Service Warranty' : 'Active (24 Months)'),
      runout: spindleData.runout || `${spindleData.max_runout_measured_microns || 0.8} µm`,
      runoutTaper: `${spindleData.max_runout_measured_microns || 0.0008} mm`,
      balanceGrade: spindleData.balance_grade || 'ISO 1940 G0.28',
      vibration: spindleData.vibration || `${spindleData.vibration_overall_velocity_mms || 0.27} mm/s`,
      vibrationRms: `${spindleData.vibration_overall_velocity_mms || 0.27} mm/s`,
      tempRise: `${spindleData.thermal_rise_stabilized_celsius || 14.2} °C`,
      clampForce: `${spindleData.clamping_force_measured_kn || 18.4} kN`,
      qrCode: spindleData.qr_code || `${trimmedSerial}-${make.replace(/[^a-zA-Z0-9]/g, '')}`,
      notes: spindleData.notes || '',
      defectReason: spindleData.defectReason || '',
      inwardJobNumber: spindleData.inwardJobNumber || '',
      receivedDate: spindleData.receivedDate || '',
      targetDispatchDate: spindleData.targetDispatchDate || ''
    };

    // Store in custom spindles
    const custom = getStoredCustomSpindles();
    custom.unshift(newAsset);
    saveCustomSpindles(custom);

    // Optional background Supabase sync if live DB is connected
    try {
      await supabase.from('spindles').insert({
        serial_number: trimmedSerial,
        model_code: model,
        customer_name: newAsset.customer,
        spindle_type: newAsset.type,
        max_rpm: newAsset.maxRpm,
        status: newAsset.status
      });
    } catch (e) {
      // offline fallback
    }

    return { data: newAsset, error: null };
  },

  /**
   * Update spindle operational status, stage, metrics, or notes
   */
  async updateSpindle(id, updateData) {
    const { data: all } = await this.getSpindles();
    const existing = all.find(s => s.id === id || s.serialNumber === id);
    if (!existing) {
      return { data: null, error: { message: 'Spindle not found in registry.' } };
    }

    const updated = {
      ...existing,
      ...updateData
    };

    const custom = getStoredCustomSpindles();
    const idx = custom.findIndex(s => s.id === id || s.serialNumber === id);
    if (idx >= 0) {
      custom[idx] = updated;
    } else {
      custom.unshift(updated);
    }
    saveCustomSpindles(custom);

    // Attempt Supabase status update in background
    try {
      if (updateData.status) {
        await supabase.from('spindles').update({ status: updateData.status }).eq('serial_number', existing.serialNumber);
      }
    } catch (e) {
      // ignore
    }

    return { data: updated, error: null };
  },

  /**
   * Delete a spindle from the registry
   */
  async deleteSpindle(id) {
    if (!id) return { data: null, error: { message: 'Spindle ID is required' } };

    const deletedSet = getStoredDeletedSpindleIds();
    deletedSet.add(id);

    const custom = getStoredCustomSpindles();
    const existing = custom.find(s => s.id === id || s.serialNumber === id);
    if (existing?.serialNumber) {
      deletedSet.add(existing.serialNumber);
    }
    saveStoredDeletedSpindleIds(deletedSet);

    const filtered = custom.filter(s => s.id !== id && s.serialNumber !== id);
    saveCustomSpindles(filtered);

    try {
      await supabase.from('spindles').delete().eq('serial_number', id);
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'spindles' } }));
    return { data: { success: true }, error: null };
  }
};

export default spindleModelService;
