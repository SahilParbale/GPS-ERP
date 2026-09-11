import { baseService } from './baseService';

/**
 * Tax Invoices & Receivables Domain Service
 * Handles Invoices, Invoice Line Items, Payment Recording, and E-Way Bill generation triggers.
 */
export const invoiceService = {
  /**
   * Fetch all registered tax invoices with line items
   */
  async getInvoices(options = {}) {
    const res = await baseService.select('invoices', {
      select: `
        id,
        invoice_number,
        sales_order_id,
        proforma_invoice_id,
        customer_id,
        customer_name,
        customer_gstin,
        billing_address,
        shipping_address,
        invoice_date,
        due_date,
        payment_terms,
        subtotal,
        discount_amount,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_amount,
        paid_amount,
        balance_amount,
        status,
        notes,
        created_at,
        customer:customers(id, company_name, gstin),
        sales_order:sales_orders(id, sales_order_no),
        items:invoice_items(
          id,
          product_name,
          hsn_sac,
          quantity,
          unit_price,
          discount,
          gst_percent,
          total_price
        )
      `,
      orderBy: options.orderBy || 'invoice_date',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for frontend compatibility with InvoicesScreen
    const normalizedData = (res.data || []).map(inv => {
      const totalNum = Number(inv.total_amount || 0);
      const paidNum = Number(inv.paid_amount || 0);
      const balanceNum = totalNum - paidNum;

      return {
        id: inv.invoice_number || inv.id,
        dbId: inv.id,
        customer: inv.customer_name || inv.customer?.company_name || 'Commercial Client',
        customerId: inv.customer_id,
        refOrder: inv.sales_order?.sales_order_no || inv.notes?.match(/WO-\d{4}-\d+/)?.[0] || 'WO-2026-098',
        date: inv.invoice_date || '2026-02-10',
        dueDate: inv.due_date || '2026-03-12',
        amount: `₹${totalNum.toLocaleString('en-IN')}`,
        amountNum: totalNum,
        paidAmount: `₹${paidNum.toLocaleString('en-IN')}`,
        paidAmountNum: paidNum,
        balance: `₹${balanceNum.toLocaleString('en-IN')}`,
        balanceNum: balanceNum,
        status: inv.status === 'Partially Paid' ? 'Partial' : (inv.status === 'Pending Payment' ? 'Pending' : inv.status),
        rawStatus: inv.status,
        gstin: inv.customer_gstin || inv.customer?.gstin || '27AABCT2934K1Z4',
        subtotal: Number(inv.subtotal || 0),
        taxableAmount: Number(inv.taxable_amount || 0),
        items: inv.items || []
      };
    });

    return {
      ...res,
      data: normalizedData
    };
  },

  /**
   * Get single invoice by invoice number or UUID
   */
  async getInvoiceById(id) {
    const filter = id.includes('-') && id.length === 36 ? { id } : { invoice_number: id };
    const res = await baseService.select('invoices', {
      select: `
        *,
        items:invoice_items(*),
        customer:customers(*)
      `,
      filter
    });
    if (res.error) return res;
    return { ...res, data: res.data?.[0] || null };
  },

  /**
   * Record payment receipt on an invoice
   */
  async recordInvoicePayment(invoiceId, paymentAmount = null) {
    const invRes = await this.getInvoiceById(invoiceId);
    if (invRes.error || !invRes.data) {
      return { data: null, error: { message: 'Invoice not found to record payment.' } };
    }

    const inv = invRes.data;
    const currentPaid = Number(inv.paid_amount || 0);
    const total = Number(inv.total_amount || 0);
    const amountToApply = paymentAmount !== null ? Number(paymentAmount) : (total - currentPaid);
    const newPaid = Math.min(total, currentPaid + amountToApply);
    const newStatus = newPaid >= total ? 'Paid' : (newPaid > 0 ? 'Partially Paid' : 'Pending Payment');

    const filterField = invoiceId.includes('-') && invoiceId.length === 36 ? 'id' : 'invoice_number';
    return await baseService.update('invoices', { [filterField]: invoiceId }, {
      paid_amount: newPaid,
      status: newStatus,
      updated_at: new Date().toISOString()
    });
  },

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(id, newStatus) {
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'invoice_number';
    let dbStatus = newStatus;
    if (newStatus === 'Partial') dbStatus = 'Partially Paid';
    if (newStatus === 'Pending') dbStatus = 'Pending Payment';

    return await baseService.update('invoices', { [filterField]: id }, {
      status: dbStatus,
      updated_at: new Date().toISOString()
    });
  }
};
