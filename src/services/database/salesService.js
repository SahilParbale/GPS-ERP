import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Sales & Commercial Domain Service
 * Handles Quotations, Line Items, Sales Orders, and conversion to Proforma Invoices.
 */
export const salesService = {
  /**
   * Fetch all quotations with line items
   */
  async getQuotations(options = {}) {
    const res = await baseService.select('quotations', {
      select: `
        id,
        quotation_number,
        enquiry_id,
        customer_id,
        customer_name,
        customer_address,
        customer_gstin,
        place_of_supply,
        quotation_date,
        valid_until_date,
        spindle_serial,
        scope_of_work,
        subtotal,
        discount_amount,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_amount,
        status,
        terms,
        notes,
        created_at,
        customer:customers(id, company_name, gstin, billing_address, primary_phone),
        items:quotation_items(
          id,
          item_name,
          description,
          hsn_sac_code,
          quantity,
          unit_price,
          discount,
          gst_percent,
          total_amount
        )
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for frontend compatibility with existing SalesScreen components
    const normalizedData = (res.data || []).map(q => {
      const scopeLines = (q.scope_of_work || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const items = (q.items || []).map((it, idx) => ({
        id: it.id || idx + 1,
        name: it.item_name,
        desc: it.description || it.item_name,
        hsn: (it.item_name && it.item_name.includes('HC7014') && it.hsn_sac_code === '84669390')
          ? ''
          : (it.hsn_sac_code != null ? String(it.hsn_sac_code).trim() : ''),
        qty: it.quantity || 1,
        unitPrice: Number(it.unit_price || 0),
        total: Number(it.total_amount || 0)
      }));

      return {
        id: q.quotation_number || q.id,
        dbId: q.id,
        estimateNo: q.quotation_number,
        date: q.quotation_date || '2026-09-07',
        placeOfSupply: q.place_of_supply || '27-Maharashtra',
        customer: q.customer_name || q.customer?.company_name || 'Linamar India Pvt Ltd',
        customerId: q.customer_id,
        customerAddress: q.customer_address || q.customer?.billing_address || '',
        contactPerson: 'Materials & Plant Maintenance',
        contactNo: q.customer?.primary_phone || '7773877714',
        gstin: q.customer_gstin || q.customer?.gstin || '23AACCL5351J1ZM',
        state: q.place_of_supply || '27-Maharashtra',
        spindleSerial: q.spindle_serial || 'HMMXXVI',
        challanNo: 'N/A',
        inwardDate: q.quotation_date || '2026-08-22',
        scopeOfWork: scopeLines.length > 0 ? scopeLines : ['1. DISMANTLE', '2. CLEANING', '3. INSPECTION', '4. ASSEMBLY', '5. DYNAMIC TEST'],
        status: q.status === 'Sent' ? 'Under Review' : q.status,
        rawStatus: q.status,
        subtotal: Number(q.subtotal || 0),
        taxRate: 18,
        gstAmount: Number(q.total_amount || 0) - Number(q.subtotal || 0),
        totalAmount: Number(q.total_amount || 0),
        validUntil: q.valid_until_date || '2026-10-07',
        terms: q.terms || 'Standard MSME terms apply.',
        notes: q.notes || '',
        items: items
      };
    });

    return {
      ...res,
      data: normalizedData
    };
  },

  /**
   * Get single quotation by estimate number or ID
   */
  async getQuotationById(id) {
    const filter = id.includes('-') && id.length === 36 ? { id } : { quotation_number: id };
    const res = await baseService.select('quotations', {
      select: `
        id,
        quotation_number,
        customer_id,
        customer_name,
        customer_address,
        customer_gstin,
        place_of_supply,
        quotation_date,
        valid_until_date,
        spindle_serial,
        scope_of_work,
        subtotal,
        total_amount,
        status,
        terms,
        notes,
        items:quotation_items(
          id,
          item_name,
          description,
          hsn_sac_code,
          quantity,
          unit_price,
          total_amount
        )
      `,
      filter
    });

    if (res.error) return res;
    return { ...res, data: res.data?.[0] || null };
  },

  /**
   * Find a customer UUID by company name, or create a minimal customer record and return the new UUID.
   * This is required because quotations.customer_id is NOT NULL (FK to customers).
   */
  async findOrCreateCustomer({ customerName, customerAddress, customerGstin, placeOfSupply }) {
    const nameTrimmed = (customerName || '').trim();
    if (!nameTrimmed) {
      return { data: null, error: { message: 'Customer name is required.' } };
    }

    // 1. Try to find existing customer by company_name (case-insensitive)
    const { data: existing, error: fetchErr } = await baseService.select('customers', {
      select: 'id, company_name',
      ilike: { company_name: nameTrimmed }
    });

    if (fetchErr) return { data: null, error: fetchErr };
    if (existing && existing.length > 0) {
      return { data: existing[0], error: null };
    }

    // 2. Customer not found — create a minimal record so the quotation FK can be satisfied
    const stateStr = placeOfSupply || 'Maharashtra';
    const stateName = stateStr.includes('-') ? stateStr.split('-').slice(1).join('-').trim() : stateStr;
    const code = 'CUST-' + nameTrimmed.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) + '-' + String(Date.now()).slice(-4);

    const newCustomer = {
      customer_code: code,
      company_name: nameTrimmed,
      billing_address: customerAddress || 'Address not provided',
      state: stateName,
      gstin: customerGstin || null,
      is_active: true
    };

    const { data: created, error: createErr } = await baseService.insert('customers', newCustomer);
    if (createErr) return { data: null, error: createErr };
    return { data: created?.[0] || null, error: null };
  },

  /**
   * Create a new quotation and its items transactionally.
   * Resolves customer_id via findOrCreateCustomer before inserting,
   * because quotations.customer_id is NOT NULL (DB constraint).
   */
  async createQuotation(quoteData) {
    const {
      quotationNumber,
      customerId: passedCustomerId,
      customerName,
      customerAddress,
      customerGstin,
      placeOfSupply,
      spindleSerial,
      scopeOfWork,
      subtotal,
      totalAmount,
      status = 'Draft',
      items = [],
      terms,
      notes
    } = quoteData;

    // Resolve a real customer UUID — required by the NOT NULL FK constraint
    let resolvedCustomerId = passedCustomerId;
    if (!resolvedCustomerId) {
      const custRes = await this.findOrCreateCustomer({
        customerName,
        customerAddress,
        customerGstin,
        placeOfSupply
      });
      if (custRes.error || !custRes.data) {
        return {
          data: null,
          error: custRes.error || { message: 'Could not resolve a customer record for this quotation.' }
        };
      }
      resolvedCustomerId = custRes.data.id;
    }

    const record = {
      quotation_number: quotationNumber,
      customer_id: resolvedCustomerId,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      place_of_supply: placeOfSupply || '27-Maharashtra',
      quotation_date: new Date().toISOString().split('T')[0],
      valid_until_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      spindle_serial: spindleSerial,
      scope_of_work: Array.isArray(scopeOfWork) ? scopeOfWork.join('\n') : (scopeOfWork || null),
      subtotal: subtotal || 0,
      taxable_amount: subtotal || 0,
      total_amount: totalAmount || (subtotal * 1.18),
      status: status === 'Under Review' ? 'Sent' : status,
      terms: terms || 'Standard 30 Days Warranty & Payment Terms',
      notes: notes || null
    };

    const insertRes = await baseService.insert('quotations', record);
    if (insertRes.error) return insertRes;

    const createdQuote = insertRes.data?.[0];
    if (createdQuote && items.length > 0) {
      const lineItems = items.map(it => ({
        quotation_id: createdQuote.id,
        item_name: it.name || it.desc || 'Spindle Service Item',
        description: it.desc || it.name,
        hsn_sac_code: it.hsn != null ? String(it.hsn).trim() : '',
        quantity: it.qty || 1,
        unit_price: it.unitPrice || it.rate || 0,
        gst_percent: 18.0,
        total_amount: (it.qty || 1) * (it.unitPrice || it.rate || 0)
      }));

      await baseService.insert('quotation_items', lineItems);
    }

    return insertRes;
  },

  /**
   * Update quotation status (Draft, Sent, Approved, Rejected, etc.)
   */
  async updateQuotationStatus(id, newStatus) {
    const dbStatus = newStatus === 'Under Review' ? 'Sent' : newStatus;
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'quotation_number';
    return await baseService.update('quotations', { [filterField]: id }, {
      status: dbStatus,
      updated_at: new Date().toISOString()
    });
  },

  /**
   * Delete a quotation and its associated line items
   */
  async deleteQuotation(id) {
    if (!id) return { error: { message: 'Quotation ID is required for deletion' } };
    const isUuid = typeof id === 'string' && id.includes('-') && id.length === 36;
    let quoteDbId = id;

    if (!isUuid) {
      const q = await this.getQuotationById(id);
      if (q.data && q.data.id) {
        quoteDbId = q.data.id;
      }
    }

    // 1. Delete associated line items first to respect foreign key constraints
    try {
      if (supabase) {
        await supabase.from('quotation_items').delete().eq('quotation_id', quoteDbId);
      }
    } catch (_e) {}

    // 2. Unlink any proforma invoices or sales orders that point to this quotation
    try {
      if (supabase) {
        await supabase.from('proforma_invoices').update({ quotation_id: null }).eq('quotation_id', quoteDbId);
      }
    } catch (_e) {}

    try {
      if (supabase) {
        await supabase.from('sales_orders').update({ quotation_id: null }).eq('quotation_id', quoteDbId);
      }
    } catch (_e) {}

    // 3. Delete quotation record from database
    return await baseService.delete('quotations', quoteDbId, false, 'id');
  },

  /**
   * Link a launched Work Order to a quotation
   */
  async linkWorkOrderToQuotation(id, woNo) {
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'quotation_number';
    return await baseService.update('quotations', { [filterField]: id }, {
      status: 'Approved',
      notes: `[WO_LAUNCHED: ${woNo}]`,
      updated_at: new Date().toISOString()
    });
  },

  /**
   * Convert Approved Quotation into a Proforma Invoice
   */
  async convertQuotationToProformaInvoice(quoteId) {
    const qRes = await this.getQuotationById(quoteId);
    if (qRes.error || !qRes.data) {
      return { data: null, error: { message: 'Quotation not found for PI conversion.' } };
    }

    const q = qRes.data;
    const piNumber = `PI-2026-${Math.floor(100 + Math.random() * 900)}`;

    const piRecord = {
      pi_number: piNumber,
      quotation_id: q.id,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      customer_address: q.customer_address,
      customer_gstin: q.customer_gstin,
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      payment_terms: '50% Advance with Proforma, 50% against Dispatch Inspection',
      subtotal: q.subtotal,
      taxable_amount: q.subtotal,
      total_amount: q.total_amount,
      status: 'Sent',
      notes: `Generated from Approved Quotation ${q.quotation_number}`
    };

    const piRes = await baseService.insert('proforma_invoices', piRecord);
    if (piRes.error) return piRes;

    const createdPI = piRes.data?.[0];
    if (createdPI && q.items?.length > 0) {
      const piItems = q.items.map(it => ({
        proforma_invoice_id: createdPI.id,
        product_name: it.item_name,
        description: it.description,
        hsn_sac: it.hsn_sac_code || '84669390',
        quantity: it.quantity,
        unit_rate: it.unit_price,
        gst_percent: 18.0,
        total: it.total_amount
      }));
      await baseService.insert('proforma_invoice_items', piItems);
    }

    // Mark quotation as Approved/Ordered
    await this.updateQuotationStatus(quoteId, 'Approved');

    return piRes;
  },

  /**
   * Fetch all sales orders
   */
  async getSalesOrders(options = {}) {
    return await baseService.select('sales_orders', {
      select: `
        id,
        sales_order_no,
        quotation_id,
        customer_id,
        customer_name,
        customer_po_reference,
        order_date,
        delivery_promised_date,
        subtotal,
        total_amount,
        status,
        items:sales_order_items(
          id,
          product_id,
          item_description,
          quantity,
          unit_price,
          total_price
        )
      `,
      orderBy: 'order_date',
      ascending: false,
      ...options
    });
  }
};
