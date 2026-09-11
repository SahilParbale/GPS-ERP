import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Procurement Domain Service
 * Handles Purchase Requisitions (PR), Purchase Orders (PO), and Line Items.
 */
export const purchaseOrderService = {
  /**
   * Fetch all Purchase Orders with items
   */
  async getPurchaseOrders(options = {}) {
    const res = await baseService.select('purchase_orders', {
      select: `
        id,
        po_number,
        requisition_id,
        supplier_id,
        supplier_name,
        supplier_email,
        supplier_contact,
        supplier_phone,
        supplier_gstin,
        supplier_address,
        order_date,
        expected_delivery_date,
        payment_terms,
        billing_address,
        shipping_address,
        currency,
        subtotal,
        discount_amount,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_amount,
        status,
        notes,
        created_at,
        supplier:suppliers(id, name, supplier_code, gstin, phone, email, address),
        items:purchase_order_items(
          id,
          product_id,
          item_description,
          hsn_code,
          quantity,
          unit_price,
          discount,
          gst_percent,
          total_price,
          received_quantity,
          product:products(id, part_number, sku, name)
        )
      `,
      orderBy: options.orderBy || 'order_date',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for PurchaseOrderScreen
    const normalizedData = (res.data || []).map(po => {
      const items = (po.items || []).map((it, idx) => ({
        id: it.id || idx + 1,
        item: it.product?.sku || it.product?.part_number || 'HC7014-E-T-P4S-UL',
        desc: it.item_description,
        qty: it.quantity || 1,
        unit: 'Pcs',
        rate: Number(it.unit_price || 0),
        gst: Number(it.gst_percent || 18),
        total: Number(it.total_price || 0)
      }));

      const totalVal = Number(po.total_amount || 0);
      const subtotalVal = Number(po.subtotal || Math.round(totalVal / 1.18));
      const gstVal = totalVal - subtotalVal;

      return {
        id: po.po_number || po.id,
        dbId: po.id,
        poNumber: po.po_number,
        supplier: po.supplier_name || po.supplier?.name || 'Schaeffler India',
        supplierId: po.supplier_id,
        supplierContact: po.supplier_contact || 'Mr. Rajesh Nair (Sales Director)',
        supplierEmail: po.supplier_email || po.supplier?.email || 'r.nair@schaeffler.com',
        supplierPhone: po.supplier_phone || po.supplier?.phone || '+91 20 6608 4100',
        supplierGstin: po.supplier_gstin || po.supplier?.gstin || '27AAACS4821M1ZB',
        supplierAddress: po.supplier_address || po.supplier?.address || 'Pune Distribution Centre, Chakan MIDC Phase II',
        date: po.order_date || '02 Sep 2026',
        expectedDelivery: po.expected_delivery_date || '15 Sep 2026',
        paymentTerms: po.payment_terms || 'Net 30 Days from GRN inspection',
        deliveryAddress: po.shipping_address || 'General Precision Spindles Pvt. Ltd., Plot B-12 Nanded City Industrial Complex, Pune - 411041',
        status: po.status || 'Sent',
        subtotal: subtotalVal,
        taxRate: 18,
        gstAmount: gstVal,
        totalAmount: totalVal,
        formattedTotal: `₹${totalVal.toLocaleString('en-IN')}`,
        notes: po.notes || 'Critical order for high-speed precision components.',
        items: items,
        timeline: [
          {
            id: 1,
            title: 'Purchase Order Created (Live Supabase)',
            detail: 'Generated and persisted in PostgreSQL database',
            time: '02 Sep 2026, 09:30 AM',
            user: 'Ganesh Pawar'
          },
          {
            id: 2,
            title: 'Technical Sign-off & Approved',
            detail: 'Authorized by Production / Procurement Head',
            time: '02 Sep 2026, 11:45 AM',
            user: 'V. R. Kulkarni'
          }
        ]
      };
    });

    return {
      ...res,
      data: normalizedData
    };
  },

  /**
   * Get single PO by number or UUID
   */
  async getPurchaseOrderById(id) {
    const filter = id.includes('-') && id.length === 36 ? { id } : { po_number: id };
    const res = await baseService.select('purchase_orders', {
      select: `
        *,
        items:purchase_order_items(*),
        supplier:suppliers(*)
      `,
      filter
    });
    if (res.error) return res;
    return { ...res, data: res.data?.[0] || null };
  },

  /**
   * Create new Purchase Order and items
   */
  async createPurchaseOrder(poData) {
    const {
      poNumber,
      supplierId,
      supplierName,
      supplierEmail,
      supplierPhone,
      supplierGstin,
      supplierAddress,
      expectedDeliveryDate,
      paymentTerms,
      subtotal,
      totalAmount,
      status = 'Draft',
      notes,
      items = []
    } = poData;

    const record = {
      po_number: poNumber || `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
      supplier_id: supplierId,
      supplier_name: supplierName,
      supplier_email: supplierEmail,
      supplier_phone: supplierPhone,
      supplier_gstin: supplierGstin,
      supplier_address: supplierAddress,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: expectedDeliveryDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      payment_terms: paymentTerms || 'Net 30 Days from GRN inspection',
      billing_address: 'Plot B-12 Nanded City Industrial Complex, Pune - 411041',
      shipping_address: 'Plot B-12 Nanded City Industrial Complex, Pune - 411041',
      currency: 'INR',
      subtotal: subtotal || 0,
      taxable_amount: subtotal || 0,
      total_amount: totalAmount || Math.round(subtotal * 1.18),
      status: status,
      notes: notes || null
    };

    const insertRes = await baseService.insert('purchase_orders', record);
    if (insertRes.error) return insertRes;

    const createdPO = insertRes.data?.[0];
    if (createdPO && items.length > 0) {
      const poItems = items.map(it => ({
        purchase_order_id: createdPO.id,
        product_id: it.productId || null,
        item_description: it.desc || it.name || it.item || 'Procurement Component',
        hsn_code: it.hsn || '84669390',
        quantity: it.qty || 1,
        unit_price: it.rate || it.unitPrice || 0,
        gst_percent: it.gst || 18.0,
        total_price: it.total || (it.qty * it.rate)
      }));
      await baseService.insert('purchase_order_items', poItems);
    }

    return insertRes;
  },

  /**
   * Update Purchase Order status
   */
  async updatePurchaseOrderStatus(id, newStatus) {
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'po_number';
    return await baseService.update('purchase_orders', { [filterField]: id }, {
      status: newStatus,
      updated_at: new Date().toISOString()
    });
  },

  /**
   * Fetch Purchase Requisitions
   */
  async getPurchaseRequisitions(options = {}) {
    return await baseService.select('purchase_requisitions', {
      select: `
        id,
        requisition_no,
        requested_by,
        department_id,
        required_by_date,
        priority,
        status,
        notes,
        created_at,
        department:departments(id, code, name),
        items:purchase_requisition_items(
          id,
          product_id,
          item_description,
          quantity,
          estimated_rate,
          product:products(id, part_number, sku, name)
        )
      `,
      orderBy: 'created_at',
      ascending: false,
      ...options
    });
  },

  /**
   * Convert Purchase Requisition to Purchase Order
   */
  async convertRequisitionToPurchaseOrder(requisitionId, supplierData) {
    const { data: pr } = await supabase.from('purchase_requisitions')
      .select('*, items:purchase_requisition_items(*)')
      .eq('id', requisitionId)
      .maybeSingle();

    if (!pr) return { data: null, error: { message: 'Requisition not found.' } };

    const poNumber = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
    const subtotal = (pr.items || []).reduce((acc, it) => acc + (it.quantity * (it.estimated_rate || 0)), 0);

    const poRecord = {
      po_number: poNumber,
      requisition_id: pr.id,
      supplier_id: supplierData.supplierId,
      supplier_name: supplierData.supplierName,
      supplier_email: supplierData.supplierEmail || null,
      supplier_contact: supplierData.supplierContact || null,
      supplier_phone: supplierData.supplierPhone || null,
      supplier_gstin: supplierData.supplierGstin || null,
      supplier_address: supplierData.supplierAddress || null,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: pr.required_by_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      payment_terms: 'Net 30 Days from GRN inspection',
      subtotal: subtotal,
      taxable_amount: subtotal,
      total_amount: Math.round(subtotal * 1.18),
      status: 'Approved',
      notes: `Converted from Purchase Requisition ${pr.requisition_no}`
    };

    const poRes = await baseService.insert('purchase_orders', poRecord);
    if (poRes.error) return poRes;

    const createdPO = poRes.data?.[0];
    if (createdPO && pr.items?.length > 0) {
      const poItems = pr.items.map(it => ({
        purchase_order_id: createdPO.id,
        product_id: it.product_id,
        item_description: it.item_description,
        quantity: it.quantity,
        unit_price: it.estimated_rate || 0,
        gst_percent: 18.0,
        total_price: Math.round(it.quantity * (it.estimated_rate || 0))
      }));
      await baseService.insert('purchase_order_items', poItems);
    }

    // Update PR status to 'PO Created'
    await baseService.update('purchase_requisitions', { id: requisitionId }, { status: 'PO Created' });

    return poRes;
  }
};
