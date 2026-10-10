import { supabase } from '../supabase/supabaseClient.js';
import { normalizeDatabaseError } from '../database/baseService.js';
import { authService, DEMO_USERS } from '../auth/authService.js';

/**
 * Authoritative 9-Role Metadata & RBAC Matrix for GPS Spindle ERP
 */
export const ROLE_METADATA = {
  ADMIN: {
    code: 'ADMIN',
    name: 'Plant Admin & Operations',
    description: 'Full master authority across all 75 tables, system settings, RBAC, and financials',
    color: '#7A1F3D',
    bg: '#F5E8ED',
    accessLevel: 'Full Master System Authority',
    allowedModules: ['Dashboard', 'Production', 'Workforce', 'Spindles', 'Quality', 'Inventory', 'Sales & Quotes', 'Invoices', 'Purchase Orders', 'Suppliers', 'Customers', 'Documents', 'Reports', 'Settings & RBAC'],
    deniedModules: []
  },
  MANAGEMENT: {
    code: 'MANAGEMENT',
    name: 'Executive Leadership',
    description: 'Executive visibility across production, commercial, quality, finance, and plant audit logs',
    color: '#5a1329',
    bg: '#F5E8ED',
    accessLevel: 'Executive Management & Audit',
    allowedModules: ['Dashboard', 'Production', 'Workforce', 'Spindles', 'Quality', 'Inventory', 'Sales & Quotes', 'Invoices', 'Purchase Orders', 'Suppliers', 'Customers', 'Documents', 'Reports', 'Settings (Read)'],
    deniedModules: ['Admin Master RBAC Mutation']
  },
  PROD_MGR: {
    code: 'PROD_MGR',
    name: 'Production Manager',
    description: 'Shop floor operations, work order scheduling, machine bays, and workforce routing',
    color: '#1d4ed8',
    bg: '#eff6ff',
    accessLevel: 'Production & Shop Floor Control',
    allowedModules: ['Dashboard', 'Production & Work Orders', 'Staff & Workforce', 'Spindle Fleet', 'Quality & Metrology', 'Inventory Stock', 'Documents', 'Plant Reports'],
    deniedModules: ['Sales & Invoices', 'Purchase Orders', 'Customer Accounts', 'Vendor Master', 'System Settings']
  },
  QA_MGR: {
    code: 'QA_MGR',
    name: 'Quality Assurance Manager',
    description: 'Metrology sign-off, runout inspections, ISO certificates, and NCR resolution',
    color: '#047857',
    bg: '#ecfdf5',
    accessLevel: 'Metrology & Quality Sign-Off',
    allowedModules: ['Dashboard', 'Quality & Metrology', 'Spindle Inspection', 'Production Work Orders', 'Documents', 'Quality Reports'],
    deniedModules: ['Commercial Sales', 'Tax Invoices', 'Purchase Orders', 'Vendor Directory', 'System Settings']
  },
  SALES: {
    code: 'SALES',
    name: 'Commercial & Sales Lead',
    description: 'Enquiries, costing quotations, customer sales orders, proforma & tax invoices, and E-Way bills',
    color: '#b45309',
    bg: '#fffbeb',
    accessLevel: 'Commercial, Quotes & GST Invoicing',
    allowedModules: ['Dashboard', 'Quotations & Sales', 'Proforma Invoices', 'Tax Invoices & Billing', 'E-Way Bills', 'Customer Directory', 'Sales Activity', 'Documents', 'Reports'],
    deniedModules: ['Shop Floor Production', 'Machine Calibrations', 'Quality Metrology', 'Procurement & POs', 'System Settings']
  },
  PURCHASE: {
    code: 'PURCHASE',
    name: 'Procurement Controller',
    description: 'Purchase requisitions, vendor POs, supplier directory, and component procurement',
    color: '#0e7490',
    bg: '#ecfeff',
    accessLevel: 'Procurement & Vendor Purchase Orders',
    allowedModules: ['Dashboard', 'Purchase Orders (PO)', 'Precision Suppliers', 'Inventory Catalog', 'Documents', 'Procurement Reports'],
    deniedModules: ['Customer Sales & Quotes', 'Invoices & Billing', 'Production Bay Control', 'Metrology Sign-off', 'System Settings']
  },
  STORES: {
    code: 'STORES',
    name: 'Warehouse & Inventory Lead',
    description: 'Inventory bin tracking, stock adjustments, GRN inwarding, and dispatch crates',
    color: '#4f46e5',
    bg: '#eef2ff',
    accessLevel: 'Warehouse & Stock Control',
    allowedModules: ['Dashboard', 'Inventory Stock Control', 'Purchase Orders', 'Supplier Directory', 'Documents', 'Inventory Reports'],
    deniedModules: ['Customer Quotes', 'Invoices & Billing', 'Quality Metrology Sign-Off', 'Work Order Scheduling', 'System Settings']
  },
  SERVICE: {
    code: 'SERVICE',
    name: 'Service & Rebuild Lead',
    description: 'Spindle 9-stage restoration pipeline, overhaul jobs, warranty tracking, and dynamic balancing',
    color: '#c2410c',
    bg: '#fff7ed',
    accessLevel: 'Spindle Service & 9-Stage Overhaul',
    allowedModules: ['Dashboard', 'Service & Overhaul', 'Spindle Fleet Registry', 'Quality Testing', 'Documents', 'Service Reports'],
    deniedModules: ['Commercial Sales & Invoices', 'Purchase Orders', 'Customer Billing', 'Procurement Lead', 'System Settings']
  },
  OPERATOR: {
    code: 'OPERATOR',
    name: 'Shop Floor Precision Technician',
    description: 'Machining work logging, daily task completion, and personal shift attendance',
    color: '#475569',
    bg: '#f1f5f9',
    accessLevel: 'Workforce & Personal Work Logging Only',
    allowedModules: ['Dashboard (Personal)', 'Staff & Workforce (Own Logs)', 'Engineering Documents & Vault', 'Plant Notifications'],
    deniedModules: ['Sales & Quotations', 'Invoices & GST Billing', 'Purchase Orders', 'Supplier Directory', 'Customer Directory', 'Quality Inspection Sign-off', 'Inventory Stock Control', 'System Settings & Users']
  }
};

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
   * Fetch available company plant departments
   */
  async getDepartments() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, code, name')
        .order('name');
      if (error || !data || data.length === 0) {
        return [
          { id: 'd0000000-0000-0000-0000-000000000001', code: 'DEPT-PROD', name: 'Production Machining' },
          { id: 'd0000000-0000-0000-0000-000000000002', code: 'DEPT-ASSY', name: 'Cleanroom Assembly' },
          { id: 'd0000000-0000-0000-0000-000000000003', code: 'DEPT-QA', name: 'Metrology & QA' },
          { id: 'd0000000-0000-0000-0000-000000000004', code: 'DEPT-SRV', name: 'Service & Rebuild' },
          { id: 'd0000000-0000-0000-0000-000000000005', code: 'DEPT-COMM', name: 'Sales & Commercial' },
          { id: 'd0000000-0000-0000-0000-000000000006', code: 'DEPT-SCM', name: 'Procurement & Stores' }
        ];
      }
      return data;
    } catch {
      return [
        { id: 'd0000000-0000-0000-0000-000000000001', code: 'DEPT-PROD', name: 'Production Machining' },
        { id: 'd0000000-0000-0000-0000-000000000002', code: 'DEPT-ASSY', name: 'Cleanroom Assembly' },
        { id: 'd0000000-0000-0000-0000-000000000003', code: 'DEPT-QA', name: 'Metrology & QA' },
        { id: 'd0000000-0000-0000-0000-000000000004', code: 'DEPT-SRV', name: 'Service & Rebuild' },
        { id: 'd0000000-0000-0000-0000-000000000005', code: 'DEPT-COMM', name: 'Sales & Commercial' },
        { id: 'd0000000-0000-0000-0000-000000000006', code: 'DEPT-SCM', name: 'Procurement & Stores' }
      ];
    }
  },

  /**
   * Fetch live authorized users from public.employees joined with departments and roles,
   * merged seamlessly with any locally registered custom accounts.
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
          email,
          phone,
          avatar_color,
          employee_code,
          designation,
          current_status,
          is_active,
          department:departments!employees_department_id_fkey(id, name, code),
          role:roles(id, name, code, description)
        `)
        .order('first_name', { ascending: true });

      const dbUsers = (data || []).map(emp => {
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_code;
        const roleCode = emp.role?.code || 'OPERATOR';
        const meta = ROLE_METADATA[roleCode] || ROLE_METADATA.OPERATOR;

        return {
          id: emp.id,
          employeeCode: emp.employee_code,
          name: fullName,
          email: emp.email || `${emp.employee_code.toLowerCase()}@gpsspindles.com`,
          phone: emp.phone || '',
          avatarColor: emp.avatar_color || '#7A1F3D',
          dept: emp.department?.name || 'Plant Operations',
          role: emp.designation || emp.role?.name || meta.name,
          roleCode,
          roleMeta: meta,
          access: meta.accessLevel,
          systemAccess: 'ERP-AUTH-OK',
          status: emp.is_active ? 'Active' : 'Inactive'
        };
      });

      // Merge with custom created users if not already present by email or code
      const customUsers = authService.getCustomUsers();
      const existingEmails = new Set(dbUsers.map(u => (u.email || '').toLowerCase()));
      const existingCodes = new Set(dbUsers.map(u => (u.employeeCode || '').toLowerCase()));

      const additionalUsers = [];
      for (const cu of customUsers) {
        if (!existingEmails.has((cu.email || '').toLowerCase()) && !existingCodes.has((cu.employeeCode || '').toLowerCase())) {
          const meta = ROLE_METADATA[cu.role] || ROLE_METADATA.OPERATOR;
          additionalUsers.push({
            id: cu.id,
            employeeCode: cu.employeeCode,
            name: cu.name,
            email: cu.email,
            phone: cu.phone || '',
            avatarColor: cu.avatarColor || '#7A1F3D',
            dept: cu.department || 'Production Machining',
            role: cu.designation || meta.name,
            roleCode: cu.role,
            roleMeta: meta,
            access: meta.accessLevel,
            systemAccess: 'ERP-AUTH-OK',
            status: 'Active',
            isCustomCreated: true
          });
        }
      }

      return { data: [...dbUsers, ...additionalUsers], error: null };
    } catch (err) {
      console.error('[GPS-ERP Settings] Failed to load authorized users:', err);
      // Fallback to DEMO_USERS + custom users
      const customUsers = authService.getCustomUsers();
      const allUsers = [...DEMO_USERS, ...customUsers].map(u => {
        const meta = ROLE_METADATA[u.role] || ROLE_METADATA.OPERATOR;
        return {
          id: u.id,
          employeeCode: u.employeeCode,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          avatarColor: u.avatarColor || '#7A1F3D',
          dept: u.department || 'Operations',
          role: u.designation || meta.name,
          roleCode: u.role,
          roleMeta: meta,
          access: meta.accessLevel,
          systemAccess: 'ERP-AUTH-OK',
          status: 'Active'
        };
      });
      return { data: allUsers, error: null };
    }
  },

  /**
   * Create & Generate a new Authorized User ID with assigned RBAC Role
   * @param {object} payload
   */
  async createAuthorizedUser(payload) {
    try {
      const {
        firstName,
        lastName,
        email,
        phone = '',
        employeeCode,
        roleCode = 'OPERATOR',
        departmentId,
        departmentName = 'Production Machining',
        designation = 'Shop Floor Precision Technician',
        password = 'Password123!',
        avatarColor = '#7A1F3D'
      } = payload;

      const trimmedEmail = (email || '').trim().toLowerCase();
      const fullName = `${firstName || ''} ${lastName || ''}`.trim();

      // 1. Resolve role ID from database
      let targetRoleId = null;
      try {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id')
          .eq('code', roleCode)
          .maybeSingle();
        targetRoleId = roleData?.id || null;
      } catch (err) {
        console.warn('[Settings] Role resolution warning:', err);
      }

      // 2. Insert into public.employees in PostgreSQL
      let createdEmployeeId = null;
      try {
        const { data: empData, error: empErr } = await supabase
          .from('employees')
          .insert({
            employee_code: employeeCode,
            first_name: firstName,
            last_name: lastName,
            email: trimmedEmail,
            phone: phone,
            department_id: departmentId || null,
            designation: designation,
            role_id: targetRoleId,
            current_status: 'Available',
            avatar_color: avatarColor,
            is_active: true
          })
          .select()
          .maybeSingle();

        if (!empErr && empData) {
          createdEmployeeId = empData.id;
        }
      } catch (dbErr) {
        console.warn('[Settings] Direct DB employee insertion notice:', dbErr.message);
      }

      // 3. Register user credentials into local auth storage for instant login
      const roleMeta = ROLE_METADATA[roleCode] || ROLE_METADATA.OPERATOR;
      const customUserRecord = {
        id: createdEmployeeId || `emp-${Date.now()}`,
        name: fullName,
        email: trimmedEmail,
        password: password,
        employeeCode: employeeCode,
        role: roleCode,
        roleLabel: roleMeta.name,
        department: departmentName,
        designation: designation,
        phone: phone,
        avatarColor: avatarColor,
        isCustomCreated: true,
        createdAt: new Date().toISOString()
      };

      authService.registerCustomUser(customUserRecord);

      // 4. Log audit event
      await this.logSettingsAudit({
        action: 'CREATE',
        table_name: 'employees',
        record_id: createdEmployeeId || employeeCode,
        summary_message: `Created authorized user ID ${employeeCode} (${fullName}) with role ${roleCode}`,
        new_values: {
          employee_code: employeeCode,
          name: fullName,
          email: trimmedEmail,
          role: roleCode,
          department: departmentName
        }
      });

      return { data: customUserRecord, error: null };
    } catch (err) {
      console.error('[Settings] Failed to create authorized user:', err);
      return { data: null, error: normalizeDatabaseError(err) };
    }
  },

  /**
   * Update an employee's assigned role
   */
  async updateUserRole({ employeeId, email, newRoleCode, designation }) {
    try {
      // 1. Update in database if connected
      if (employeeId) {
        let roleId = null;
        const { data: roleData } = await supabase.from('roles').select('id').eq('code', newRoleCode).maybeSingle();
        if (roleData) roleId = roleData.id;

        const updatePayload = { designation };
        if (roleId) updatePayload.role_id = roleId;

        await supabase.from('employees').update(updatePayload).eq('id', employeeId);
      }

      // 2. Update custom users in authService
      if (email) {
        authService.updateCustomUserRole(email, newRoleCode, designation);
      }

      // 3. Log audit event
      await this.logSettingsAudit({
        action: 'UPDATE',
        table_name: 'employees',
        record_id: employeeId || email,
        summary_message: `Updated RBAC role for user (${email}) to ${newRoleCode}`
      });

      return { success: true, error: null };
    } catch (err) {
      console.error('[Settings] Failed to update user role:', err);
      return { success: false, error: normalizeDatabaseError(err) };
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
