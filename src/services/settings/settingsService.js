import { supabase } from '../supabase/supabaseClient.js';
import { normalizeDatabaseError } from '../database/baseService.js';

/**
 * Settings Domain Service
 * 
 * Provides database queries and mutations for:
 * - Enterprise Legal Identity (public.companies)
 * - Plant Facility Configuration (public.branches)
 * - Operating Shifts & Cycles (public.shifts)
 * - Authorized Personnel Directory (public.employees, public.departments, public.roles)
 * - Machine Bay Calibrations (public.machines, public.production_bays)
 * - Immutable Administrative Audit Logging (public.audit_logs)
 */
export const settingsService = {
  /**
   * Fetch company and plant settings from Supabase
   * @returns {Promise<{ data: object|null, error: object|null }>}
   */
  async getSettings() {
    try {
      // 1. Fetch authoritative company
      const { data: company, error: compError } = await supabase
        .from('companies')
        .select('*')
        .eq('code', 'GPS-CORP')
        .maybeSingle();

      if (compError) throw compError;
      if (!company) {
        throw new Error('Organization configuration not found in database (GPS-CORP).');
      }

      // 2. Fetch authoritative plant branch
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('code', 'PLANT-1')
        .maybeSingle();

      if (branchError) throw branchError;

      // 3. Fetch shifts for the plant
      const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time');

      if (shiftError) throw shiftError;

      // 4. Parse JSON metadata from logo_url if present
      let metadata = {};
      if (company.logo_url && typeof company.logo_url === 'string') {
        try {
          if (company.logo_url.startsWith('{')) {
            metadata = JSON.parse(company.logo_url);
          }
        } catch {
          metadata = {};
        }
      }

      const normalized = {
        companyId: company.id,
        branchId: branch ? branch.id : null,
        companyCode: company.code,
        branchCode: branch ? branch.code : 'PLANT-1',
        name: company.name || 'GPS Spindle Pvt. Ltd.',
        legalName: company.legal_name || 'General Precision Spindles Private Limited',
        facility: branch?.name || 'Nanded City Plant 1 (HQ)',
        address: branch?.address || company.address || 'Plot B-12, Nanded City Industrial Complex, Pune, Maharashtra 411041',
        city: branch?.city || company.city || 'Pune',
        state: branch?.state || company.state || 'Maharashtra',
        pincode: branch?.pincode || company.pincode || '411041',
        gstin: company.gstin || branch?.gstin || '27AABCG1492K1Z8',
        taxId: company.tax_id || 'AAACG1492K',
        email: company.email || 'info@gpspindles.com',
        phone: company.phone || '+91 20 2420 8000',
        iso: metadata.quality_standards || 'ISO 9001:2015 & AS9100D Aerospace Certified',
        shiftMode: metadata.shift_mode || 'Continuous 3-Shift 24x7 Operation',
        currency: company.currency || 'INR',
        shifts: shifts || [],
        alertPreferences: metadata.alert_preferences || {
          bearingLowStock: true,
          noseTaperExceeded: true,
          serviceDelayed: true,
          customerPoApproval: true
        }
      };

      return { data: normalized, error: null };
    } catch (err) {
      console.error('[GPS-ERP Settings] Failed to load live settings:', err);
      return { data: null, error: normalizeDatabaseError(err) };
    }
  },

  /**
   * Update enterprise company & plant configuration in Supabase
   * @param {object} updates 
   * @returns {Promise<{ data: object|null, error: object|null }>}
   */
  async updateSettings(updates = {}) {
    try {
      const {
        companyId,
        branchId,
        name,
        facility,
        address,
        gstin,
        iso,
        shiftMode,
        alertPreferences
      } = updates;

      if (!companyId) {
        throw new Error('Missing authoritative company identifier for settings update.');
      }

      // 1. Fetch current record to build previous_values for audit logging
      const { data: previousCompany } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      // 2. Prepare metadata JSON
      let existingMeta = {};
      if (previousCompany?.logo_url && typeof previousCompany.logo_url === 'string') {
        try {
          if (previousCompany.logo_url.startsWith('{')) {
            existingMeta = JSON.parse(previousCompany.logo_url);
          }
        } catch {
          existingMeta = {};
        }
      }

      const mergedMeta = {
        ...existingMeta,
        quality_standards: iso !== undefined ? iso : existingMeta.quality_standards,
        shift_mode: shiftMode !== undefined ? shiftMode : existingMeta.shift_mode,
        alert_preferences: alertPreferences !== undefined ? alertPreferences : existingMeta.alert_preferences,
        updated_at: new Date().toISOString()
      };

      // 3. Update public.companies
      const companyPayload = {
        name: name !== undefined ? name.trim() : previousCompany.name,
        address: address !== undefined ? address.trim() : previousCompany.address,
        gstin: gstin !== undefined ? gstin.trim().toUpperCase() : previousCompany.gstin,
        logo_url: JSON.stringify(mergedMeta),
        updated_at: new Date().toISOString()
      };

      const { data: updatedCompanyList, error: compUpdError } = await supabase
        .from('companies')
        .update(companyPayload)
        .eq('id', companyId)
        .select();

      if (compUpdError) throw compUpdError;
      if (!updatedCompanyList || updatedCompanyList.length === 0) {
        throw new Error('Permission denied: Only Admin or Management roles can modify system settings.');
      }

      // 4. Update public.branches if branchId provided
      if (branchId) {
        const branchPayload = {
          name: facility !== undefined ? facility.trim() : undefined,
          address: address !== undefined ? address.trim() : undefined,
          gstin: gstin !== undefined ? gstin.trim().toUpperCase() : undefined,
          updated_at: new Date().toISOString()
        };

        // Remove undefined fields
        Object.keys(branchPayload).forEach(key => branchPayload[key] === undefined && delete branchPayload[key]);

        const { error: branchUpdError } = await supabase
          .from('branches')
          .update(branchPayload)
          .eq('id', branchId);

        if (branchUpdError) {
          console.warn('[GPS-ERP Settings] Branch update non-fatal warning:', branchUpdError);
        }
      }

      // 5. Update shift status if shift mode changed
      if (shiftMode) {
        if (shiftMode === 'Continuous 3-Shift 24x7 Operation') {
          await supabase.from('shifts').update({ is_active: true }).in('shift_code', ['SHIFT-A', 'SHIFT-B', 'SHIFT-C']);
        } else if (shiftMode.includes('Shift A') && shiftMode.includes('Shift B')) {
          await supabase.from('shifts').update({ is_active: true }).in('shift_code', ['SHIFT-A', 'SHIFT-B']);
          await supabase.from('shifts').update({ is_active: false }).eq('shift_code', 'SHIFT-C');
        } else if (shiftMode.includes('Single General Shift')) {
          await supabase.from('shifts').update({ is_active: true }).eq('shift_code', 'SHIFT-A');
          await supabase.from('shifts').update({ is_active: false }).in('shift_code', ['SHIFT-B', 'SHIFT-C']);
        }
      }

      // 6. Log administrative audit trail
      await this.logSettingsAudit({
        action: 'UPDATE',
        table_name: 'companies',
        record_id: companyId,
        summary_message: `Updated company plant profile: ${name || previousCompany.name}`,
        previous_values: {
          name: previousCompany?.name,
          address: previousCompany?.address,
          gstin: previousCompany?.gstin,
          logo_url: previousCompany?.logo_url
        },
        new_values: companyPayload
      });

      // 7. Return reconciled fresh settings
      return await this.getSettings();
    } catch (err) {
      console.error('[GPS-ERP Settings] Update failed:', err);
      return { data: null, error: normalizeDatabaseError(err) };
    }
  },

  /**
   * Fetch live authorized users from public.employees joined with departments and roles
   * @returns {Promise<{ data: Array|null, error: object|null }>}
   */
  async getAuthorizedUsers() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          employee_code,
          designation,
          current_status,
          is_active,
          department:departments!employees_department_id_fkey(id, name, code),
          role:roles(id, name, code, description)
        `)
        .order('first_name', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map(emp => {
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_code;
        const roleCode = emp.role?.code || 'OPERATOR';
        
        let accessLevel = 'Shop Floor Routing';
        if (roleCode === 'ADMIN') accessLevel = 'Full System Admin';
        else if (roleCode === 'MANAGEMENT') accessLevel = 'Executive Management';
        else if (roleCode === 'QA_MGR') accessLevel = 'QC Sign-Off & Certs';
        else if (roleCode === 'PROD_MGR') accessLevel = 'Production Planning & Routing';
        else if (roleCode === 'SERVICE') accessLevel = 'Assembly & Service Log';
        else if (roleCode === 'STORES') accessLevel = 'BOM & Stores Control';
        else if (roleCode === 'PURCHASE') accessLevel = 'BOM & PO Procurement';
        else if (roleCode === 'SALES') accessLevel = 'Sales & Dispatch Orders';

        return {
          id: emp.id,
          name: fullName,
          dept: emp.department?.name || 'Plant Operations',
          role: emp.designation || emp.role?.name || 'Technician',
          roleCode,
          access: accessLevel,
          systemAccess: 'ERP-AUTH-OK',
          status: emp.is_active ? 'Active' : 'Inactive'
        };
      });

      return { data: formatted, error: null };
    } catch (err) {
      console.error('[GPS-ERP Settings] Failed to load authorized users:', err);
      return { data: null, error: normalizeDatabaseError(err) };
    }
  },

  /**
   * Fetch live machine calibrations from public.machines joined with production_bays
   * @returns {Promise<{ data: Array|null, error: object|null }>}
   */
  async getMachineCalibrations() {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select(`
          id,
          name,
          code,
          manufacturer,
          model_number,
          machine_type,
          precision_tolerance_microns,
          status,
          last_calibration_date,
          next_calibration_due,
          bay:production_bays(id, name, code)
        `)
        .order('name', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map(m => {
        const agency = m.manufacturer ? `${m.manufacturer} Certified` : 'NABL Accredited Lab';
        const standard = m.precision_tolerance_microns 
          ? `ISO 230-2 / Tol ≤ ${m.precision_tolerance_microns} µm`
          : 'ISO 21940-21 Standard';

        return {
          id: m.id,
          asset: `${m.name}${m.model_number ? ` (${m.model_number})` : ''}`,
          station: m.bay?.code ? `${m.bay.code} - ${m.bay.name.split(' - ')[1] || m.bay.name}` : (m.bay?.name || 'Shop Floor'),
          standard: standard,
          last: m.last_calibration_date || '2026-01-15',
          next: m.next_calibration_due || '2026-07-15',
          agency: agency,
          status: m.status === 'Operating' ? 'Valid' : (m.status === 'Calibrating' ? 'In Progress' : 'Pending')
        };
      });

      return { data: formatted, error: null };
    } catch (err) {
      console.error('[GPS-ERP Settings] Failed to load machine calibrations:', err);
      return { data: null, error: normalizeDatabaseError(err) };
    }
  },

  /**
   * Log an immutable administrative event to public.audit_logs
   * @param {object} event 
   */
  async logSettingsAudit(event = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const auditRecord = {
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'System Admin',
        user_email: user.email,
        action: event.action || 'UPDATE',
        module: 'Settings',
        table_name: event.table_name || 'companies',
        record_id: String(event.record_id || ''),
        summary_message: event.summary_message || 'System settings updated',
        previous_values: event.previous_values || null,
        new_values: event.new_values || null
      };

      await supabase.from('audit_logs').insert(auditRecord);
    } catch (err) {
      console.warn('[GPS-ERP Settings] Audit log non-blocking notice:', err.message);
    }
  }
};

export default settingsService;
