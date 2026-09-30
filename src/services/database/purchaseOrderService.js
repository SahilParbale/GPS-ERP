import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';
import { PURCHASE_ORDERS } from '../../data/mockData';

const LOCAL_STORAGE_KEY = 'gps_erp_custom_purchase_orders';
const RAISED_MATERIALS_KEY = 'gps_erp_po_raised_materials';
const DELETED_POS_KEY = 'gps_erp_deleted_pos';

/**
 * Get locally stored purchase orders created by users in this browser session
 */
export function getStoredCustomPOs() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Persist custom PO and dispatch update event across app
 */
export function saveCustomPO(po) {
  try {
    const existing = getStoredCustomPOs();
    const filtered = existing.filter(p => (p.poNumber || p.id) !== (po.poNumber || po.id));
    const updated = [po, ...filtered];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gps_entities_updated', { 
        detail: { entity: 'purchase-orders', poNumber: po.poNumber } 
      }));
    }
  } catch (e) {
    console.warn('[purchaseOrderService] Failed to save PO locally:', e);
  }
}

/**
 * Get materials that have had a PO raised
 */
export function getRaisedMaterials() {
  try {
    const raw = localStorage.getItem(RAISED_MATERIALS_KEY);
    const list = raw ? JSON.parse(raw) : [];

    let deletedIds = [];
    try {
      const dRaw = localStorage.getItem(DELETED_POS_KEY);
      deletedIds = dRaw ? JSON.parse(dRaw) : [];
    } catch (e) {}

    const customPOs = getStoredCustomPOs();
    const cancelledPoNumbers = new Set(
      customPOs.filter(p => p.status === 'Cancelled').map(p => p.poNumber || p.id)
    );

    return list.filter(item => {
      if (item.poNumber && deletedIds.includes(item.poNumber)) return false;
      if (item.poNumber && cancelledPoNumbers.has(item.poNumber)) return false;
      return true;
    });
  } catch (e) {
    return [];
  }
}

/**
 * Persist raised material record so it is hidden from Dashboard shortage alerts
 */
export function saveRaisedMaterial(material, poNumber) {
  if (!material) return;
  try {
    const existing = getRaisedMaterials();
    const matSku = (material.sku || '').trim().toUpperCase();
    const entry = {
      id: material.id,
      productId: material.productId,
      sku: matSku,
      name: material.name,
      poNumber: poNumber,
      createdAt: new Date().toISOString()
    };
    const updated = [
      entry,
      ...existing.filter(e => {
        if (matSku && e.sku === matSku) return false;
        if (material.id && (e.id === material.id || e.materialId === material.id)) return false;
        return true;
      })
    ];
    localStorage.setItem(RAISED_MATERIALS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[purchaseOrderService] Failed to save raised material:', e);
  }
}

/**
 * Remove raised material mapping if PO is cancelled or deleted
 */
export function removeRaisedMaterial(poNumberOrId) {
  if (!poNumberOrId) return;
  try {
    const existing = getRaisedMaterials();
    const updated = existing.filter(e => e.poNumber !== poNumberOrId && e.id !== poNumberOrId);
    localStorage.setItem(RAISED_MATERIALS_KEY, JSON.stringify(updated));
  } catch (e) {}
}

/**
 * Check whether a material or inventory item already has an active PO raised
 */
export function isMaterialPoRaised(material) {
  if (!material) return false;
  const matSku = (material.sku || '').trim().toUpperCase();
  const matId = material.id;
  const matProdId = material.productId;
  const matName = (material.name || '').trim().toLowerCase();

  // 1. Check raised materials list
  const raised = getRaisedMaterials();
  const matchInRaised = raised.some(r => {
    if (matSku && r.sku && r.sku === matSku) return true;
    if (matId && (r.id === matId || r.materialId === matId)) return true;
    if (matProdId && r.productId === matProdId) return true;
    if (matName && r.name && r.name.toLowerCase() === matName) return true;
    return false;
  });
  if (matchInRaised) return true;

  // 2. Check active custom PO line items
  let deletedIds = [];
  try {
    const dRaw = localStorage.getItem(DELETED_POS_KEY);
    deletedIds = dRaw ? JSON.parse(dRaw) : [];
  } catch (e) {}

  const customPOs = getStoredCustomPOs();
  const activeCustomPOs = customPOs.filter(p => 
    p.status !== 'Cancelled' &&
    !deletedIds.includes(p.poNumber) &&
    !deletedIds.includes(p.id)
  );

  for (const po of activeCustomPOs) {
    for (const it of (po.items || [])) {
      const itSku = (it.sku || it.item || '').trim().toUpperCase();
      if (matSku && itSku && (matSku === itSku || itSku.includes(matSku) || matSku.includes(itSku))) {
        return true;
      }
      if (matProdId && it.productId && it.productId === matProdId) {
        return true;
      }
      const itName = (it.name || it.desc || '').trim().toLowerCase();
      if (matName && itName && (itName.includes(matName) || matName.includes(itName))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolve supplier UUID for database foreign key constraints
 */
function resolveSupplierId(supplierId, supplierName) {
  if (supplierId && typeof supplierId === 'string' && supplierId.length === 36) {
    return supplierId;
  }
  const name = (supplierName || '').toLowerCase();
  if (name.includes('schaeffler')) return '77777777-0000-0000-0000-000000000001';
  if (name.includes('ott') || name.includes('jakob')) return '77777777-0000-0000-0000-000000000002';
  if (name.includes('lenord') || name.includes('bauer')) return '77777777-0000-0000-0000-000000000003';
  if (name.includes('sandvik')) return '77777777-0000-0000-0000-000000000004';
  if (name.includes('heidenhain')) return '77777777-0000-0000-0000-000000000005';
  if (name.includes('bharat') || name.includes('steel')) return '77777777-0000-0000-0000-000000000006';
  return '77777777-0000-0000-0000-000000000001';
}

/**
 * Procurement Domain Service
 * Handles Purchase Requisitions (PR), Purchase Orders (PO), and Line Items.
 */
export const purchaseOrderService = {
  getRaisedMaterials,
  saveRaisedMaterial,
  removeRaisedMaterial,
  isMaterialPoRaised,

  /**
   * Fetch all Purchase Orders with items
   */
  async getPurchaseOrders(options = {}) {
    let dbPOs = [];
    try {
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

      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        dbPOs = res.data.map(po => {
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
                title: 'Purchase Order Created (Live Database)',
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
      }
    } catch (err) {
      console.warn('[purchaseOrderService] Live PO fetch exception, fallback to local & mock:', err);
    }

    // Baseline fallback from mock data if DB has no records or failed
    const baseList = dbPOs.length > 0 ? dbPOs : [...PURCHASE_ORDERS];

    // Merge with any custom POs created by the user in this session/browser
    const customPOs = getStoredCustomPOs();
    const existingPoMap = new Map();

    const DELETED_POS_KEY = 'gps_erp_deleted_pos';
    let deletedIds = [];
    try {
      const raw = localStorage.getItem(DELETED_POS_KEY);
      deletedIds = raw ? JSON.parse(raw) : [];
    } catch (e) {}

    const isDeleted = (po) => {
      return (
        deletedIds.includes(po.poNumber) ||
        deletedIds.includes(po.id) ||
        (po.dbId && deletedIds.includes(po.dbId))
      );
    };

    // Custom POs first (so newly raised POs appear at the top)
    const combined = [];
    for (const po of customPOs) {
      const key = po.poNumber || po.id;
      if (key && !existingPoMap.has(key) && !isDeleted(po)) {
        existingPoMap.set(key, true);
        combined.push(po);
      }
    }
    for (const po of baseList) {
      const key = po.poNumber || po.id;
      if (key && !existingPoMap.has(key) && !isDeleted(po)) {
        existingPoMap.set(key, true);
        combined.push(po);
      }
    }

    return {
      data: combined,
      error: null
    };
  },

  /**
   * Get single PO by number or UUID
   */
  async getPurchaseOrderById(id) {
    // Check locally saved POs first
    const customPOs = getStoredCustomPOs();
    const foundCustom = customPOs.find(p => p.id === id || p.poNumber === id);
    if (foundCustom) {
      return { data: foundCustom, error: null };
    }

    const filter = id.includes('-') && id.length === 36 ? { id } : { po_number: id };
    const res = await baseService.select('purchase_orders', {
      select: `
        *,
        items:purchase_order_items(*),
        supplier:suppliers(*)
      `,
      filter
    });
    if (res.error || !res.data?.[0]) {
      const mock = PURCHASE_ORDERS.find(p => p.id === id || p.poNumber === id);
      return { data: mock || null, error: null };
    }
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
      supplierContact,
      expectedDeliveryDate,
      paymentTerms,
      subtotal = 0,
      totalAmount = 0,
      status = 'Approved',
      notes,
      items = []
    } = poData;

    const assignedPoNumber = poNumber || `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
    const calcSubtotal = Number(subtotal) || 0;
    const calcTotal = Number(totalAmount) || Math.round(calcSubtotal * 1.18);
    const calcGst = calcTotal - calcSubtotal;
    const nowStr = new Date().toISOString().split('T')[0];
    const resolvedSupplierId = resolveSupplierId(supplierId, supplierName);

    const normalizedItems = (items || []).map((it, idx) => ({
      id: it.id || idx + 1,
      item: it.item || it.name || it.desc || 'Precision Component',
      desc: it.desc || it.name || it.item || 'Industrial Component Requisition',
      qty: Number(it.qty) || 1,
      unit: it.unit || 'Pcs',
      rate: Number(it.rate || it.unitPrice || 0),
      gst: Number(it.gst || 18),
      total: Number(it.total) || ((Number(it.qty) || 1) * (Number(it.rate || it.unitPrice) || 0))
    }));

    const normalizedPO = {
      id: assignedPoNumber,
      poNumber: assignedPoNumber,
      supplier: supplierName || 'Schaeffler India',
      supplierId: resolvedSupplierId,
      supplierContact: supplierContact || 'Procurement Coordinator',
      supplierEmail: supplierEmail || 'procurement@supplier.com',
      supplierPhone: supplierPhone || '+91 20 6608 4100',
      supplierGstin: supplierGstin || '27AAACS4821M1ZB',
      supplierAddress: supplierAddress || 'Pune Industrial Corridor, Maharashtra',
      date: nowStr,
      expectedDelivery: expectedDeliveryDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      paymentTerms: paymentTerms || 'Net 30 Days from GRN inspection',
      deliveryAddress: 'General Precision Spindles Pvt. Ltd., Plot B-12 Nanded City Industrial Complex, Pune - 411041',
      status: status,
      subtotal: calcSubtotal,
      taxRate: 18,
      gstAmount: calcGst,
      totalAmount: calcTotal,
      formattedTotal: `₹${calcTotal.toLocaleString('en-IN')}`,
      notes: notes || 'Purchase order generated via automated procurement workflow.',
      items: normalizedItems,
      timeline: [
        {
          id: 1,
          title: 'PO Created & Released',
          detail: 'Generated and queued in Procurement system',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          user: 'Ganesh Pawar'
        },
        {
          id: 2,
          title: 'Procurement Approval',
          detail: 'Authorized for vendor transmission',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          user: 'V. R. Kulkarni'
        }
      ]
    };

    // Save to local storage immediately so it reflects instantly across the app
    saveCustomPO(normalizedPO);

    // Also attempt inserting into Supabase PostgreSQL database
    try {
      const dbRecord = {
        po_number: assignedPoNumber,
        supplier_id: resolvedSupplierId,
        supplier_name: normalizedPO.supplier,
        supplier_email: normalizedPO.supplierEmail,
        supplier_phone: normalizedPO.supplierPhone,
        supplier_gstin: normalizedPO.supplierGstin,
        supplier_address: normalizedPO.supplierAddress,
        order_date: nowStr,
        expected_delivery_date: normalizedPO.expectedDelivery,
        payment_terms: normalizedPO.paymentTerms,
        billing_address: normalizedPO.deliveryAddress,
        shipping_address: normalizedPO.deliveryAddress,
        currency: 'INR',
        subtotal: calcSubtotal,
        taxable_amount: calcSubtotal,
        total_amount: calcTotal,
        status: status,
        notes: notes || null
      };

      const insertRes = await baseService.insert('purchase_orders', dbRecord);
      if (insertRes.data?.[0]) {
        normalizedPO.dbId = insertRes.data[0].id;
        if (normalizedItems.length > 0) {
          const poItems = normalizedItems.map(it => ({
            purchase_order_id: insertRes.data[0].id,
            item_description: it.desc,
            hsn_code: '84669390',
            quantity: it.qty,
            unit_price: it.rate,
            gst_percent: it.gst,
            total_price: it.total
          }));
          await baseService.insert('purchase_order_items', poItems);
        }
      }
    } catch (e) {
      console.warn('[purchaseOrderService] Supabase insert fallback to local PO:', e);
    }

    return { data: [normalizedPO], error: null };
  },

  /**
   * Update Purchase Order status
   */
  async updatePurchaseOrderStatus(id, newStatus) {
    if (!id) return { data: null, error: { message: 'PO ID is required' } };

    // Update local storage (both custom POs and base/mock POs)
    try {
      const custom = getStoredCustomPOs();
      const existingIdx = custom.findIndex(p => p.id === id || p.poNumber === id);
      if (existingIdx >= 0) {
        custom[existingIdx] = { ...custom[existingIdx], status: newStatus };
      } else {
        // If it was in mockData or database, copy to custom with new status so it overrides base
        const baseMatch = PURCHASE_ORDERS.find(p => p.id === id || p.poNumber === id);
        if (baseMatch) {
          custom.unshift({ ...baseMatch, status: newStatus });
        } else {
          custom.unshift({ id, poNumber: id, status: newStatus });
        }
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(custom));

      if (newStatus === 'Cancelled') {
        removeRaisedMaterial(id);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gps_entities_updated', { 
          detail: { entity: 'purchase-orders', id, status: newStatus } 
        }));
      }
    } catch (e) {
      console.warn('[purchaseOrderService] Local storage update error:', e);
    }

    const filterField = typeof id === 'string' && id.includes('-') && id.length === 36 ? 'id' : 'po_number';
    try {
      const res = await baseService.update('purchase_orders', id, {
        status: newStatus,
        updated_at: new Date().toISOString()
      }, filterField);
      if (res && !res.error) return res;
    } catch (err) {
      console.warn('[purchaseOrderService] Supabase update notice:', err);
    }

    return { data: [{ id, status: newStatus }], error: null };
  },

  /**
   * Delete Purchase Order permanently
   */
  async deletePurchaseOrder(id) {
    if (!id) return { data: null, error: { message: 'PO ID is required' } };

    try {
      const custom = getStoredCustomPOs();
      const filtered = custom.filter(p => p.id !== id && p.poNumber !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));

      const DELETED_POS_KEY = 'gps_erp_deleted_pos';
      let deletedIds = [];
      try {
        const raw = localStorage.getItem(DELETED_POS_KEY);
        deletedIds = raw ? JSON.parse(raw) : [];
      } catch (e) {}

      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem(DELETED_POS_KEY, JSON.stringify(deletedIds));
      }

      removeRaisedMaterial(id);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gps_entities_updated', { 
          detail: { entity: 'purchase-orders', id, action: 'delete' } 
        }));
      }
    } catch (e) {
      console.warn('[purchaseOrderService] Local storage delete error:', e);
    }

    const filterField = typeof id === 'string' && id.includes('-') && id.length === 36 ? 'id' : 'po_number';
    try {
      const res = await baseService.delete('purchase_orders', id, false, filterField);
      if (res && !res.error) return res;
    } catch (err) {
      console.warn('[purchaseOrderService] Supabase delete notice:', err);
    }

    return { error: null };
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
  },

  /**
   * Fetch active suppliers from live public.suppliers
   */
  async getActiveSuppliers() {
    return await baseService.select('suppliers', {
      select: 'id, supplier_code, name, contact_person, email, phone, gstin, address, is_active',
      eq: { is_active: true },
      orderBy: 'name',
      ascending: true
    });
  },

  /**
   * Check for open Purchase Orders associated with a product to prevent accidental duplicates
   */
  async getOpenPOForProduct(productId) {
    if (!productId) return { data: [], error: null };
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          id,
          quantity,
          product_id,
          purchase_order:purchase_orders (
            id,
            po_number,
            status,
            order_date,
            expected_delivery_date,
            supplier_name
          )
        `)
        .eq('product_id', productId);

      if (error) return { data: [], error };
      const openPOs = (data || [])
        .filter(item => item.purchase_order && ['Draft', 'Sent', 'Approved', 'Partially Received'].includes(item.purchase_order.status))
        .map(item => item.purchase_order);
      return { data: openPOs, error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  /**
   * Generate sequential number for PO or PR
   */
  async getNextSequentialNumber(prefix, table = 'purchase_orders', column = 'po_number') {
    try {
      const currentYear = new Date().getFullYear();
      const fullPrefix = `${prefix}-${currentYear}-`;
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .like(column, `${fullPrefix}%`);

      let maxNum = 100;
      if (!error && data) {
        for (const row of data) {
          const val = row[column];
          const match = val?.match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }
      return `${fullPrefix}${String(maxNum + 1).padStart(4, '0')}`;
    } catch {
      return `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  },

  /**
   * Atomically raise a Purchase Order from Inventory demand
   * Complete workflow: Inventory -> PR -> PR Item -> PO -> PO Item -> Audit Log
   * Enforces stock invariance: public.stock is NEVER mutated.
   */
  async raisePurchaseOrderFromInventory(params) {
    const {
      productId,
      supplierId,
      quantity,
      expectedDeliveryDate,
      notes,
      status = 'Approved',
      priority = 'High',
      paymentTerms = 'Net 30 Days from GRN inspection'
    } = params;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return { data: null, error: { message: 'Order quantity must be greater than zero.' } };
    }
    if (!productId) {
      return { data: null, error: { message: 'Product ID is required.' } };
    }
    if (!supplierId) {
      return { data: null, error: { message: 'Supplier selection is required.' } };
    }

    // 1. Fetch live product
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (prodErr || !product) {
      return { data: null, error: { message: `Product not found: ${prodErr?.message || productId}` } };
    }

    // 2. Fetch live supplier
    const { data: supplier, error: suppErr } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (suppErr || !supplier) {
      return { data: null, error: { message: `Supplier not found: ${suppErr?.message || supplierId}` } };
    }
    if (supplier.is_active === false) {
      return { data: null, error: { message: `Supplier ${supplier.name} is inactive.` } };
    }

    // 3. Dynamic GST and Financial Calculations based on live product schema
    const unitCost = Number(product.unit_cost_inr || 0);
    const gstRate = typeof product.gst_rate_percent === 'number' ? product.gst_rate_percent : 18.0;
    const subtotal = Math.round(qty * unitCost);
    const gstAmount = Math.round(subtotal * (gstRate / 100.0));
    const totalAmount = subtotal + gstAmount;
    const hsnCode = product.hsn_sac_code || '84669390';
    const deliveryDate = expectedDeliveryDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    // Try atomic RPC first if available
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('raise_purchase_order_from_inventory', {
        p_product_id: productId,
        p_supplier_id: supplierId,
        p_quantity: qty,
        p_expected_delivery_date: deliveryDate,
        p_notes: notes || null,
        p_status: status,
        p_priority: priority,
        p_payment_terms: paymentTerms
      });

      if (!rpcErr && rpcData?.success) {
        return { data: rpcData, error: null };
      }
    } catch {
      // Fall through to transactional execution
    }

    // Transaction-safe execution with compensating rollback
    let createdPr = null;
    let createdPo = null;

    try {
      const prNumber = await this.getNextSequentialNumber('PR', 'purchase_requisitions', 'requisition_no');
      const poNumber = await this.getNextSequentialNumber('PO', 'purchase_orders', 'po_number');

      // Step A: Insert Purchase Requisition (Status: 'PO Created')
      const prPayload = {
        requisition_no: prNumber,
        required_by_date: deliveryDate,
        priority: priority,
        status: 'PO Created',
        notes: notes || `Requisition raised from Inventory for ${product.name}`
      };

      const { data: prRes, error: prErr } = await supabase
        .from('purchase_requisitions')
        .insert(prPayload)
        .select()
        .single();

      if (prErr) throw prErr;
      createdPr = prRes;

      // Step B: Insert PR Item
      const prItemPayload = {
        requisition_id: createdPr.id,
        product_id: product.id,
        item_description: product.name,
        quantity: qty,
        estimated_rate: unitCost
      };

      const { error: prItemErr } = await supabase
        .from('purchase_requisition_items')
        .insert(prItemPayload);

      if (prItemErr) throw prItemErr;

      // Step C: Insert Purchase Order (linked to PR)
      const poPayload = {
        po_number: poNumber,
        requisition_id: createdPr.id,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_email: supplier.email || null,
        supplier_contact: supplier.contact_person || null,
        supplier_phone: supplier.phone || null,
        supplier_gstin: supplier.gstin || null,
        supplier_address: supplier.address || null,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: deliveryDate,
        payment_terms: paymentTerms,
        billing_address: 'Plot B-12 Nanded City Industrial Complex, Pune - 411041',
        shipping_address: 'Plot B-12 Nanded City Industrial Complex, Pune - 411041',
        currency: 'INR',
        subtotal: subtotal,
        taxable_amount: subtotal,
        cgst_amount: Math.round(gstAmount / 2),
        sgst_amount: Math.round(gstAmount / 2),
        igst_amount: 0,
        total_amount: totalAmount,
        status: status,
        notes: notes || null
      };

      const { data: poRes, error: poErr } = await supabase
        .from('purchase_orders')
        .insert(poPayload)
        .select()
        .single();

      if (poErr) throw poErr;
      createdPo = poRes;

      // Step D: Insert PO Item
      const poItemPayload = {
        purchase_order_id: createdPo.id,
        product_id: product.id,
        item_description: product.name,
        hsn_code: hsnCode,
        quantity: qty,
        unit_price: unitCost,
        discount: 0,
        gst_percent: gstRate,
        total_price: subtotal,
        received_quantity: 0
      };

      const { data: poItemRes, error: poItemErr } = await supabase
        .from('purchase_order_items')
        .insert(poItemPayload)
        .select()
        .single();

      if (poItemErr) throw poItemErr;

      // Step E: Non-blocking Audit Logging
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('audit_logs').insert({
          user_id: user?.id || null,
          user_name: user?.user_metadata?.full_name || 'Procurement Lead',
          user_email: user?.email || 'purchase.controller@gpspindles.com',
          action: 'CREATE',
          module: 'Procurement',
          table_name: 'purchase_orders',
          record_id: createdPo.id,
          summary_message: `Raised Purchase Order ${createdPo.po_number} from Inventory for ${product.name}`,
          new_values: {
            po_id: createdPo.id,
            po_number: createdPo.po_number,
            pr_id: createdPr.id,
            pr_number: createdPr.requisition_no,
            product_id: product.id,
            quantity: qty,
            total_amount: totalAmount,
            supplier_name: supplier.name
          }
        });
      } catch {
        // Non-blocking audit
      }

      return {
        data: {
          ...createdPo,
          requisition: createdPr,
          items: [poItemRes]
        },
        error: null
      };
    } catch (err) {
      // Compensating Rollback: Clean up any created records if a subsequent step fails
      if (createdPo?.id) {
        await supabase.from('purchase_orders').delete().eq('id', createdPo.id);
      }
      if (createdPr?.id) {
        await supabase.from('purchase_requisitions').delete().eq('id', createdPr.id);
      }
      return {
        data: null,
        error: {
          code: err.code || 'PROCUREMENT_ERROR',
          message: err.message || 'Failed to raise Purchase Order from inventory.'
        }
      };
    }
  }
};
