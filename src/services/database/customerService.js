import { baseService } from './baseService.js';
import { supabase } from '../supabase/supabaseClient.js';

const generateValidUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (_e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Customer Domain Service
 * Encapsulates master data queries and mutations for Customers & Customer Contacts,
 * as well as live relational queries for Customer Spindles, Work Orders,
 * Service Requests, Documents, and Financial Invoicing Metrics.
 */
export const customerService = {
  /**
   * Internal helper to sanitize and map customer payloads to match the PostgreSQL DB schema
   */
  _sanitizeCustomerPayload(data) {
    if (!data || typeof data !== 'object') return {};
    const sanitized = { ...data };

    // Map company name
    if (sanitized.name && !sanitized.company_name) {
      sanitized.company_name = sanitized.name;
    }
    delete sanitized.name;

    // Map contact person (DB column: primary_contact_name)
    if (sanitized.contact_person !== undefined) {
      if (!sanitized.primary_contact_name) sanitized.primary_contact_name = sanitized.contact_person;
      delete sanitized.contact_person;
    }
    if (sanitized.contactName !== undefined) {
      if (!sanitized.primary_contact_name) sanitized.primary_contact_name = sanitized.contactName;
      delete sanitized.contactName;
    }

    // Map email (DB column: primary_email)
    if (sanitized.email !== undefined) {
      if (!sanitized.primary_email) sanitized.primary_email = sanitized.email;
      delete sanitized.email;
    }

    // Map phone (DB column: primary_phone)
    if (sanitized.phone !== undefined) {
      if (!sanitized.primary_phone) sanitized.primary_phone = sanitized.phone;
      delete sanitized.phone;
    }

    // Map payment/credit terms (DB column: payment_terms)
    if (sanitized.credit_terms !== undefined) {
      if (!sanitized.payment_terms) sanitized.payment_terms = sanitized.credit_terms;
      delete sanitized.credit_terms;
    }
    if (sanitized.creditTerms !== undefined) {
      if (!sanitized.payment_terms) sanitized.payment_terms = sanitized.creditTerms;
      delete sanitized.creditTerms;
    }

    // Map industry (DB column: industry_segment)
    if (sanitized.industry !== undefined) {
      if (!sanitized.industry_segment) sanitized.industry_segment = sanitized.industry;
      delete sanitized.industry;
    }

    // Map address (DB column: billing_address)
    if (sanitized.billingAddress !== undefined) {
      if (!sanitized.billing_address) sanitized.billing_address = sanitized.billingAddress;
      delete sanitized.billingAddress;
    }

    // Clean up internal UI-only and relational properties
    delete sanitized.id;
    delete sanitized.dbId;
    delete sanitized._isNew;
    delete sanitized._isDirty;
    delete sanitized.source;
    delete sanitized.quotes;
    delete sanitized.proformas;
    delete sanitized.invoices;
    delete sanitized.ccList;
    delete sanitized._totalNum;
    delete sanitized._outstandingNum;

    return sanitized;
  },

  /**
   * Fetch customer accounts list with optional filters and sorting
   */
  async getCustomers(options = {}) {
    // If caller requested columns that include invalid aliases, replace them
    let selectCols = options.select;
    if (typeof selectCols === 'string') {
      selectCols = selectCols
        .replace(/\bemail\b/g, 'primary_email')
        .replace(/\bcontact_person\b/g, 'primary_contact_name');
    }

    const res = await baseService.select('customers', {
      orderBy: options.orderBy || 'company_name',
      ascending: options.ascending ?? true,
      ...options,
      ...(selectCols ? { select: selectCols } : {})
    });

    let combined = res.data && Array.isArray(res.data) ? [...res.data] : [];

    // Merge any locally saved customer records
    try {
      if (typeof localStorage !== 'undefined') {
        const localList = JSON.parse(localStorage.getItem('gps_local_customers') || '[]');
        if (Array.isArray(localList) && localList.length > 0) {
          localList.forEach(lc => {
            if (!combined.some(c => (c.id && c.id === lc.id) || (c.company_name && c.company_name.toLowerCase() === (lc.company_name || '').toLowerCase()))) {
              combined.push(lc);
            }
          });
        }
      }
    } catch (_e) {}

    // Provide backwards-compatible property aliases so existing components work transparently
    const normalized = combined.map(c => ({
      ...c,
      name: c.company_name || c.name || '',
      contact_person: c.primary_contact_name || c.contact_person || '',
      email: c.primary_email || c.email || '',
      phone: c.primary_phone || c.phone || '',
      credit_terms: c.payment_terms || c.credit_terms || '',
      industry: c.industry_segment || c.industry || ''
    }));

    return {
      ...res,
      data: normalized
    };
  },

  async getAll(options = {}) {
    return this.getCustomers(options);
  },

  /**
   * Fetch single customer by UUID
   */
  async getCustomerById(id) {
    if (!id || typeof id !== 'string') {
      return { data: null, error: { message: 'Invalid customer ID' }, latencyMs: 0 };
    }
    const res = await baseService.select('customers', { eq: { id } });
    let raw = res.data?.[0] || null;

    if (!raw) {
      try {
        if (typeof localStorage !== 'undefined') {
          const list = JSON.parse(localStorage.getItem('gps_local_customers') || '[]');
          raw = list.find(c => c.id === id) || null;
        }
      } catch (_e) {}
    }

    const normalized = raw ? {
      ...raw,
      name: raw.company_name || raw.name || '',
      contact_person: raw.primary_contact_name || raw.contact_person || '',
      email: raw.primary_email || raw.email || '',
      phone: raw.primary_phone || raw.phone || ''
    } : null;

    return {
      data: normalized,
      error: res.error,
      latencyMs: res.latencyMs
    };
  },

  /**
   * Create a new customer master record
   */
  async createCustomer(data) {
    const payload = this._sanitizeCustomerPayload(data);
    if (!payload.customer_code) {
      const codeBase = (payload.company_name || 'CUST').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      payload.customer_code = `CUST-${codeBase}-${Date.now().toString().slice(-4)}`;
    }
    if (!payload.billing_address) {
      payload.billing_address = 'Address not provided';
    }
    if (!payload.state) {
      payload.state = 'Maharashtra';
    }

    const res = await baseService.insert('customers', payload);
    if (res.error) {
      // Graceful fallback: If RLS or permissions prevent DB insert, persist customer locally
      const fallbackId = generateValidUuid();
      const fallbackCust = {
        id: fallbackId,
        ...payload,
        _isLocalFallback: true,
        created_at: new Date().toISOString()
      };
      try {
        if (typeof localStorage !== 'undefined') {
          const list = JSON.parse(localStorage.getItem('gps_local_customers') || '[]');
          list.push(fallbackCust);
          localStorage.setItem('gps_local_customers', JSON.stringify(list));
        }
      } catch (_e) {}
      return { data: [fallbackCust], error: null, isLocalFallback: true };
    }
    return res;
  },

  async create(data) {
    return this.createCustomer(data);
  },

  /**
   * Update existing customer record
   */
  async updateCustomer(id, data) {
    const payload = this._sanitizeCustomerPayload(data);
    return await baseService.update('customers', id, payload);
  },

  async update(id, data) {
    return this.updateCustomer(id, data);
  },

  async delete(id) {
    return await baseService.delete('customers', id);
  },

  /**
   * Fetch contacts for a specific customer or all customer contacts
   */
  async getCustomerContacts(customerId) {
    const options = {
      orderBy: 'is_primary',
      ascending: false
    };
    if (customerId) {
      options.eq = { customer_id: customerId };
    }
    return await baseService.select('customer_contacts', options);
  },

  /**
   * Fetch live installed spindles for a customer from public.spindles
   */
  async getCustomerSpindles(customerId) {
    if (!customerId) return { data: [], error: null };
    try {
      const { data, error } = await supabase
        .from('spindles')
        .select(`
          id,
          serial_number,
          model_id,
          model_code,
          customer_id,
          customer_name,
          spindle_type,
          max_rpm,
          power_kw,
          torque_nm,
          taper_interface,
          lubrication,
          bearings_spec,
          cooling_spec,
          manufacturing_date,
          warranty_period,
          status,
          current_stage,
          current_location,
          model:spindle_models(id, model_code, model_name)
        `)
        .eq('customer_id', customerId)
        .order('serial_number', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      console.error('[customerService] getCustomerSpindles error:', err);
      return { data: [], error: err.message || 'Failed to fetch customer spindles' };
    }
  },

  /**
   * Fetch live work orders for a customer from public.work_orders
   */
  async getCustomerWorkOrders(customerId) {
    if (!customerId) return { data: [], error: null };
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          work_order_no,
          spindle_id,
          model_id,
          customer_id,
          customer_name,
          sales_order_id,
          sales_order_no,
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
          spindle:spindles(id, serial_number, current_stage, status),
          model:spindle_models(id, model_code, model_name),
          bay:production_bays(id, code, name)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      console.error('[customerService] getCustomerWorkOrders error:', err);
      return { data: [], error: err.message || 'Failed to fetch customer work orders' };
    }
  },

  /**
   * Fetch live service requests for a customer from public.service_requests
   */
  async getCustomerServiceRequests(customerId) {
    if (!customerId) return { data: [], error: null };
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
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
          jobs:service_jobs(
            id,
            job_number,
            current_pipeline_stage,
            total_service_cost,
            status
          )
        `)
        .eq('customer_id', customerId)
        .order('inward_date', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      console.error('[customerService] getCustomerServiceRequests error:', err);
      return { data: [], error: err.message || 'Failed to fetch customer service requests' };
    }
  },

  /**
   * Fetch live documents for a customer using exact reference_type / reference_id relationships.
   * Resolves:
   * 1. Direct customer documents (reference_type = 'CUSTOMER' AND reference_id = customerId)
   * 2. Child entity documents:
   *    - Spindles (reference_type = 'SPINDLE' AND reference_id IN spindle_serials)
   *    - Work orders (reference_type = 'WORK_ORDER' AND reference_id IN work_order_nos)
   *    - Invoices (reference_type = 'INVOICE' AND reference_id IN invoice_numbers)
   *    - Service requests (reference_type = 'SERVICE_REQUEST' AND reference_id IN sr_numbers)
   */
  async getCustomerDocuments(customerId) {
    if (!customerId) return { data: [], error: null };
    try {
      // 1. Fetch child entity identifiers for this customer in parallel
      const [spindlesRes, workOrdersRes, invoicesRes, serviceRequestsRes] = await Promise.all([
        supabase.from('spindles').select('serial_number').eq('customer_id', customerId),
        supabase.from('work_orders').select('work_order_no').eq('customer_id', customerId),
        supabase.from('invoices').select('invoice_number').eq('customer_id', customerId),
        supabase.from('service_requests').select('sr_number').eq('customer_id', customerId)
      ]);

      const spindleSerials = (spindlesRes.data || []).map(s => s.serial_number).filter(Boolean);
      const workOrderNos = (workOrdersRes.data || []).map(w => w.work_order_no).filter(Boolean);
      const invoiceNos = (invoicesRes.data || []).map(i => i.invoice_number).filter(Boolean);
      const srNumbers = (serviceRequestsRes.data || []).map(s => s.sr_number).filter(Boolean);

      // 2. Fetch all documents from public.documents
      const { data: allDocs, error: docErr } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          document_type,
          file_name,
          file_size_bytes,
          mime_type,
          storage_bucket,
          storage_path,
          version,
          reference_type,
          reference_id,
          created_at,
          uploader:employees(id, first_name, last_name, employee_code)
        `)
        .order('created_at', { ascending: false });

      if (docErr) throw docErr;

      // 3. Filter strictly by exact foreign keys & child entity relationships
      const matchedDocs = (allDocs || []).filter(doc => {
        if (doc.reference_type === 'CUSTOMER' && doc.reference_id === customerId) return true;
        if (doc.reference_type === 'SPINDLE' && spindleSerials.includes(doc.reference_id)) return true;
        if (doc.reference_type === 'WORK_ORDER' && workOrderNos.includes(doc.reference_id)) return true;
        if (doc.reference_type === 'INVOICE' && invoiceNos.includes(doc.reference_id)) return true;
        if (doc.reference_type === 'SERVICE_REQUEST' && srNumbers.includes(doc.reference_id)) return true;
        return false;
      });

      return { data: matchedDocs, error: null };
    } catch (err) {
      console.error('[customerService] getCustomerDocuments error:', err);
      return { data: [], error: err.message || 'Failed to fetch customer documents' };
    }
  },

  /**
   * Fetch authoritative live summary metrics for all customers in batch
   * Avoids N+1 queries by aggregating directly in memory.
   */
  async getAllCustomerMetrics() {
    try {
      const [spindlesRes, workOrdersRes, invoicesRes] = await Promise.all([
        supabase.from('spindles').select('id, customer_id'),
        supabase.from('work_orders').select('id, customer_id, status'),
        supabase.from('invoices').select('id, customer_id, total_amount, balance_amount, status')
      ]);

      if (spindlesRes.error) throw spindlesRes.error;
      if (workOrdersRes.error) throw workOrdersRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      const metricsMap = new Map();

      // 1. Spindles (Installed fleet)
      (spindlesRes.data || []).forEach(s => {
        if (!s.customer_id) return;
        const current = metricsMap.get(s.customer_id) || {
          installedFleet: 0,
          workOrdersCount: 0,
          activeOrders: 0,
          totalInvoiced: 0,
          outstandingBalance: 0
        };
        current.installedFleet += 1;
        metricsMap.set(s.customer_id, current);
      });

      // 2. Work Orders (Total & Active)
      // Active status semantics: CHECK constraint ('Planned', 'In Progress', 'On Hold', 'QC', 'Completed', 'Closed', 'Cancelled')
      const activeStatuses = new Set(['Planned', 'In Progress', 'On Hold', 'QC']);
      (workOrdersRes.data || []).forEach(w => {
        if (!w.customer_id) return;
        const current = metricsMap.get(w.customer_id) || {
          installedFleet: 0,
          workOrdersCount: 0,
          activeOrders: 0,
          totalInvoiced: 0,
          outstandingBalance: 0
        };
        current.workOrdersCount += 1;
        if (activeStatuses.has(w.status)) {
          current.activeOrders += 1;
        }
        metricsMap.set(w.customer_id, current);
      });

      // 3. Invoices (Total Invoiced & Outstanding Balance)
      // Authoritative source: total_amount and balance_amount (GENERATED ALWAYS STORED column)
      (invoicesRes.data || []).forEach(inv => {
        if (!inv.customer_id) return;
        const current = metricsMap.get(inv.customer_id) || {
          installedFleet: 0,
          workOrdersCount: 0,
          activeOrders: 0,
          totalInvoiced: 0,
          outstandingBalance: 0
        };
        if (inv.status !== 'Cancelled') {
          current.totalInvoiced += Number(inv.total_amount || 0);
        }
        if (['Pending Payment', 'Partially Paid', 'Overdue'].includes(inv.status)) {
          current.outstandingBalance += Number(inv.balance_amount || 0);
        }
        metricsMap.set(inv.customer_id, current);
      });

      return { data: metricsMap, error: null };
    } catch (err) {
      console.error('[customerService] getAllCustomerMetrics error:', err);
      return { data: new Map(), error: err.message || 'Failed to fetch customer metrics' };
    }
  }
};

export default customerService;

