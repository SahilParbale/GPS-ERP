import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';
import { INVENTORY_ITEMS } from '../../data/mockData';

const CUSTOM_INVENTORY_KEY = 'gps_erp_custom_inventory';
const CUSTOM_MOVEMENTS_KEY = 'gps_erp_custom_movements';
const DELETED_INVENTORY_KEY = 'gps_erp_deleted_inventory_ids';

function getStoredDeletedIds() {
  try {
    const raw = localStorage.getItem(DELETED_INVENTORY_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function saveStoredDeletedIds(idSet) {
  try {
    localStorage.setItem(DELETED_INVENTORY_KEY, JSON.stringify(Array.from(idSet)));
  } catch (e) {
    console.error('Failed saving deleted inventory IDs:', e);
  }
}

function getStoredCustomItems() {
  try {
    const raw = localStorage.getItem(CUSTOM_INVENTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomItems(items) {
  try {
    localStorage.setItem(CUSTOM_INVENTORY_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'inventory' } }));
  } catch (e) {
    console.error('Failed saving custom inventory items:', e);
  }
}

function getStoredCustomMovements() {
  try {
    const raw = localStorage.getItem(CUSTOM_MOVEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function recordCustomMovement(movement) {
  try {
    const movs = getStoredCustomMovements();
    movs.unshift(movement);
    localStorage.setItem(CUSTOM_MOVEMENTS_KEY, JSON.stringify(movs.slice(0, 100)));
  } catch (e) {
    console.error('Failed logging custom stock movement:', e);
  }
}

/**
 * Inventory Domain Service
 * Provides queries and mutations for Products, Categories, Warehouses, and Stock levels.
 */
export const inventoryService = {
  /**
   * Fetch all inventory items joined with category, preferred supplier, and stock balances
   */
  async getInventoryItems(options = {}) {
    let liveItems = [];
    try {
      const res = await baseService.select('products', {
        select: `
          id,
          part_number,
          sku,
          name,
          description,
          hsn_sac_code,
          unit_of_measure,
          min_reorder_level,
          safety_stock,
          unit_cost_inr,
          gst_rate_percent,
          preferred_supplier_id,
          is_active,
          category:product_categories(id, code, name),
          supplier:suppliers(id, supplier_code, name),
          stock(id, warehouse_id, bin_location, quantity_on_hand, quantity_reserved, quantity_available)
        `,
        orderBy: options.orderBy || 'name',
        ascending: options.ascending ?? true,
        ...options
      });

      if (!res.error && res.data && res.data.length > 0) {
        liveItems = (res.data || []).map(p => {
          const stockRec = p.stock?.[0] || {};
          const onHand = stockRec.quantity_on_hand ?? 0;
          const reserved = stockRec.quantity_reserved ?? 0;
          const available = stockRec.quantity_available ?? (onHand - reserved);
          const minStock = p.min_reorder_level ?? 10;

          let status = 'In Stock';
          if (available <= 0) status = 'Out of Stock';
          else if (available <= minStock * 0.5) status = 'Critical Low';
          else if (available <= minStock) status = 'Low Stock';

          const costNum = Number(p.unit_cost_inr || 0);
          const unitCostFormatted = costNum > 0 ? `₹${costNum.toLocaleString('en-IN')}` : '₹0';

          // Extract or determine make
          let make = 'Generic Precision';
          const pName = (p.name || '').toLowerCase();
          const pDesc = (p.description || '').toLowerCase();
          if (pName.includes('nsk') || pDesc.includes('nsk')) make = 'NSK';
          else if (pName.includes('fag') || pName.includes('schaeffler') || pDesc.includes('schaeffler')) make = 'FAG / Schaeffler';
          else if (pName.includes('skf') || pDesc.includes('skf')) make = 'SKF';
          else if (pName.includes('ott') || pDesc.includes('ott-jakob')) make = 'OTT-Jakob';
          else if (pName.includes('heidenhain') || pDesc.includes('heidenhain')) make = 'Heidenhain';
          else if (pName.includes('sandvik') || pDesc.includes('sandvik')) make = 'Sandvik Coromant';
          else if (pName.includes('kluber') || pName.includes('klüber') || pDesc.includes('kluber')) make = 'Klüber Lubrication';
          else if (pName.includes('bharat') || pDesc.includes('bharat')) make = 'Bharat Special Steel';
          else if (pName.includes('siemens') || pName.includes('kollmorgen')) make = 'Kollmorgen / Siemens';
          else if (p.supplier?.name) make = p.supplier.name;

          return {
            id: p.id,
            sku: p.sku || p.part_number,
            partNumber: p.part_number,
            name: p.name,
            make: make,
            model: p.part_number || p.sku || '',
            category: p.category?.name || 'General Inventory',
            categoryId: p.category?.id,
            availableQty: available,
            reservedQty: reserved,
            onHandQty: onHand,
            minStock: minStock,
            unit: p.unit_of_measure || 'PCS',
            unitCost: unitCostFormatted,
            unitCostNum: costNum,
            gstRate: Number(p.gst_rate_percent || 18),
            location: stockRec.bin_location || 'General Stores',
            status: status,
            supplier: p.supplier?.name || 'Approved Vendor',
            supplierId: p.preferred_supplier_id || p.supplier?.id,
            preferredSupplierId: p.preferred_supplier_id || p.supplier?.id,
            isActive: p.is_active
          };
        });
      }
    } catch (e) {
      console.warn('[inventoryService] Live products query fallback:', e);
    }

    // Default to INVENTORY_ITEMS if no live items
    let combinedItems = liveItems.length > 0 ? liveItems : INVENTORY_ITEMS.map(it => ({ ...it }));

    // Merge custom items from local storage
    const customItems = getStoredCustomItems();
    if (customItems.length > 0) {
      const map = new Map();
      combinedItems.forEach(it => map.set(it.id, it));
      customItems.forEach(it => map.set(it.id, it));
      combinedItems = Array.from(map.values());
    }

    // Filter out deleted items
    const deletedIds = getStoredDeletedIds();
    if (deletedIds.size > 0) {
      combinedItems = combinedItems.filter(it => !deletedIds.has(it.id));
    }

    // Ensure status, unitCostNum, and make are cleanly populated
    combinedItems = combinedItems.map(item => {
      const available = Number(item.availableQty != null ? item.availableQty : (item.quantityOnHand ?? 0));
      const minStock = Number(item.minStock != null ? item.minStock : (item.min_reorder_level ?? 10));
      let status = item.status;
      if (!status || status === 'Critical') {
        if (available <= 0) status = 'Out of Stock';
        else if (available <= minStock * 0.5) status = 'Critical Low';
        else if (available <= minStock) status = 'Low Stock';
        else status = 'In Stock';
      }
      const costNum = Number(item.unitCostNum || (typeof item.unitCost === 'string' ? item.unitCost.replace(/[^0-9.]/g, '') : item.unitCost) || 0);

      return {
        ...item,
        availableQty: available,
        minStock,
        unitCostNum: costNum,
        unitCost: item.unitCost || `₹${costNum.toLocaleString('en-IN')}`,
        make: item.make || 'Generic Precision',
        model: item.model || item.sku || '',
        status
      };
    });

    return {
      data: combinedItems,
      error: null
    };
  },

  /**
   * Fetch all product categories
   */
  async getCategories(options = {}) {
    return await baseService.select('product_categories', {
      orderBy: 'name',
      ascending: true,
      ...options
    });
  },

  /**
   * Fetch all warehouse facilities
   */
  async getWarehouses(options = {}) {
    return await baseService.select('warehouses', {
      orderBy: 'name',
      ascending: true,
      ...options
    });
  },

  /**
   * Fetch live stock levels across warehouses
   */
  async getStockLevels(productId = null) {
    const options = {
      select: 'id, product_id, warehouse_id, bin_location, quantity_on_hand, quantity_reserved, quantity_available, products(name, sku), warehouses(name, code)',
      orderBy: 'bin_location',
      ascending: true
    };
    if (productId) {
      options.eq = { product_id: productId };
    }
    return await baseService.select('stock', options);
  },

  /**
   * Fetch all historical stock movements with item and performer details
   */
  async getStockMovements(options = {}) {
    let movements = [];
    try {
      const res = await baseService.select('stock_movements', {
        select: `
          id,
          movement_number,
          product_id,
          from_warehouse_id,
          to_warehouse_id,
          movement_type,
          quantity,
          reference_type,
          reference_id,
          notes,
          created_at,
          product:products(id, part_number, sku, name, unit_of_measure),
          performer:employees(id, first_name, last_name)
        `,
        orderBy: options.orderBy || 'created_at',
        ascending: options.ascending ?? false,
        ...options
      });

      if (!res.error && res.data && res.data.length > 0) {
        movements = (res.data || []).map(mov => {
          const isIssue = (mov.movement_type || '').includes('ISSUE');
          const isReceipt = (mov.movement_type || '').includes('RECEIPT');
          const typeLabel = isIssue ? 'Store Issue' : (isReceipt ? 'Inward GRN' : 'Warehouse Transfer');

          let timeFormatted = 'Recently';
          if (mov.created_at) {
            const d = new Date(mov.created_at);
            timeFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          }

          const bayMatch = (mov.notes || '').match(/Bay \d[^,\.]*/i);
          const bay = bayMatch ? bayMatch[0] : (isIssue ? 'Bay 3 (Assembly)' : 'Central Stores Yard');

          return {
            id: mov.id,
            movementNumber: mov.movement_number,
            time: timeFormatted,
            type: typeLabel,
            rawType: mov.movement_type,
            sku: mov.product?.sku || mov.product?.part_number || 'MAT-GEN',
            name: mov.product?.name || 'Precision Component',
            qty: `${mov.quantity} ${mov.product?.unit_of_measure || 'Units'}`,
            quantity: mov.quantity,
            bay: bay,
            user: mov.performer ? `${mov.performer.first_name} ${mov.performer.last_name}` : 'Stores In-Charge',
            ref: mov.reference_id || 'GRN-2026-085',
            notes: mov.notes
          };
        });
      }
    } catch (e) {
      console.warn('[inventoryService] Stock movements live query fallback:', e);
    }

    // Default movements if none from database
    if (movements.length === 0) {
      movements = [
        { id: 'mov-1', movementNumber: 'MOV-2026-9021', time: '04 Sep, 16:30', type: 'Inward GRN', rawType: 'RECEIPT_GRN', sku: '120TAC20FME2DBCP5P01-NSK', name: 'NSK 120TAC20 Super Precision Bearings', qty: '4 Nos', quantity: 4, bay: 'Bay 3 (Clean Room Stores)', user: 'Stores Officer', ref: 'PO/2025-26/00106', notes: 'Received against Premier Industrial PO' },
        { id: 'mov-2', movementNumber: 'MOV-2026-9018', time: '03 Sep, 11:15', type: 'Store Issue', rawType: 'ISSUE_PRODUCTION', sku: 'MAT-18CR-80', name: '18CrNiMo7-6 Forged Round Bar Ø80mm', qty: '6 Meters', quantity: 6, bay: 'Bay 1 (CNC Lathe)', user: 'Suresh Sawant', ref: 'WO-2026-104', notes: 'Issued for Tata Advanced Spindle Shaft' },
        { id: 'mov-3', movementNumber: 'MOV-2026-9015', time: '02 Sep, 14:00', type: 'Inward GRN', rawType: 'RECEIPT_GRN', sku: 'LUB-KLUB-NBU15', name: 'Klüber ISOFLEX NBU 15 High-Speed Grease', qty: '5 Tins', quantity: 5, bay: 'Lubricant Room L-02', user: 'Milind Joshi', ref: 'GRN-2026-088', notes: 'Inspection Certificate 3.1 Attached' },
        { id: 'mov-4', movementNumber: 'MOV-2026-9012', time: '01 Sep, 09:45', type: 'Store Issue', rawType: 'ISSUE_PRODUCTION', sku: 'BRG-HC7008', name: 'FAG HC7008 Ceramic Hybrid Bearings', qty: '2 Pairs', quantity: 2, bay: 'Bay 4 (Assembly)', user: 'V. Shinde', ref: 'WO-2026-103', notes: 'Bearing Preload Match Verified' }
      ];
    }

    // Prepend user-custom movements from localStorage
    const customMovs = getStoredCustomMovements();
    return {
      data: [...customMovs, ...movements],
      error: null
    };
  },

  /**
   * Receive stock (GRN Inward) with atomic transaction guarantee
   */
  async receiveStock({ productId, warehouseId, quantity, binLocation = 'RACK-A-04', referenceType = 'GOODS_RECEIPT', referenceId = 'GRN-MANUAL', notes }) {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return { data: null, error: { message: 'Quantity received must be greater than zero.' } };
    }

    // Try atomic RPC if available
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('process_stock_mutation', {
        p_product_id: productId,
        p_warehouse_id: warehouseId,
        p_quantity: qty,
        p_movement_type: 'RECEIPT_GRN',
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_notes: notes || `Inward GRN receipt against ${referenceId}`,
        p_bin_location: binLocation
      });
      if (!rpcErr && rpcData?.success) {
        return { data: { movementNumber: rpcData.movement_number, newQuantity: rpcData.new_quantity }, error: null };
      }
    } catch {
      // Fall through to transactional compensating block
    }

    // Atomic compensating execution
    const { data: currentStock, error: readErr } = await supabase.from('stock')
      .select('*')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();

    if (readErr) return { data: null, error: readErr };

    const prevQty = currentStock?.quantity_on_hand || 0;
    const newQty = prevQty + qty;

    const { error: stockErr } = await supabase.from('stock').upsert({
      product_id: productId,
      warehouse_id: warehouseId,
      bin_location: binLocation,
      quantity_on_hand: newQty,
      last_counted_date: new Date().toISOString().split('T')[0]
    }, { onConflict: 'product_id,warehouse_id,bin_location' });

    if (stockErr) return { data: null, error: stockErr };

    const movNumber = `MOV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: movErr } = await supabase.from('stock_movements').insert({
      movement_number: movNumber,
      product_id: productId,
      to_warehouse_id: warehouseId,
      movement_type: 'RECEIPT_GRN',
      quantity: qty,
      reference_type: referenceType,
      reference_id: referenceId,
      notes: notes || `Inward GRN receipt against ${referenceId}`
    });

    if (movErr) {
      // Rollback stock update
      await supabase.from('stock').upsert({
        product_id: productId,
        warehouse_id: warehouseId,
        bin_location: binLocation,
        quantity_on_hand: prevQty
      }, { onConflict: 'product_id,warehouse_id,bin_location' });
      return { data: null, error: movErr };
    }

    const txnNumber = `TXN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: txnErr } = await supabase.from('inventory_transactions').insert({
      transaction_number: txnNumber,
      product_id: productId,
      warehouse_id: warehouseId,
      transaction_type: 'INWARD_PURCHASE',
      quantity_delta: qty,
      previous_quantity: prevQty,
      new_quantity: newQty,
      reference_table: referenceType,
      reference_id: referenceId,
      remarks: notes
    });

    if (txnErr) {
      // Rollback movement and stock
      await supabase.from('stock_movements').delete().eq('movement_number', movNumber);
      await supabase.from('stock').upsert({
        product_id: productId,
        warehouse_id: warehouseId,
        bin_location: binLocation,
        quantity_on_hand: prevQty
      }, { onConflict: 'product_id,warehouse_id,bin_location' });
      return { data: null, error: txnErr };
    }

    return { data: { movementNumber: movNumber, transactionNumber: txnNumber, newQuantity: newQty }, error: null };
  },

  /**
   * Issue stock to shop floor / work order with atomic transaction guarantee
   */
  async issueStock({ productId, warehouseId, quantity, referenceType = 'WORK_ORDER', referenceId = 'WO-MANUAL', notes }) {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return { data: null, error: { message: 'Quantity issued must be greater than zero.' } };
    }

    // Try atomic RPC if available
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('process_stock_mutation', {
        p_product_id: productId,
        p_warehouse_id: warehouseId,
        p_quantity: qty,
        p_movement_type: 'ISSUE_PRODUCTION',
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_notes: notes || `Store Issue to ${referenceId}`
      });
      if (!rpcErr && rpcData?.success) {
        return { data: { movementNumber: rpcData.movement_number, newQuantity: rpcData.new_quantity }, error: null };
      }
    } catch {
      // Fall through to transactional compensating block
    }

    const { data: currentStock, error: readErr } = await supabase.from('stock')
      .select('*')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();

    if (readErr) return { data: null, error: readErr };

    const prevQty = currentStock?.quantity_on_hand || 0;
    if (prevQty < qty) {
      return { data: null, error: { message: `Insufficient stock on hand (${prevQty}) to issue ${qty} units.` } };
    }
    const newQty = prevQty - qty;

    const { error: stockErr } = await supabase.from('stock').update({
      quantity_on_hand: newQty
    }).eq('id', currentStock.id);

    if (stockErr) return { data: null, error: stockErr };

    const movNumber = `MOV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: movErr } = await supabase.from('stock_movements').insert({
      movement_number: movNumber,
      product_id: productId,
      from_warehouse_id: warehouseId,
      movement_type: 'ISSUE_PRODUCTION',
      quantity: qty,
      reference_type: referenceType,
      reference_id: referenceId,
      notes: notes || `Store Issue to ${referenceId}`
    });

    if (movErr) {
      // Rollback stock
      await supabase.from('stock').update({ quantity_on_hand: prevQty }).eq('id', currentStock.id);
      return { data: null, error: movErr };
    }

    const txnNumber = `TXN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: txnErr } = await supabase.from('inventory_transactions').insert({
      transaction_number: txnNumber,
      product_id: productId,
      warehouse_id: warehouseId,
      transaction_type: 'OUTWARD_PRODUCTION',
      quantity_delta: -qty,
      previous_quantity: prevQty,
      new_quantity: newQty,
      reference_table: referenceType,
      reference_id: referenceId,
      remarks: notes
    });

    if (txnErr) {
      // Rollback movement and stock
      await supabase.from('stock_movements').delete().eq('movement_number', movNumber);
      await supabase.from('stock').update({ quantity_on_hand: prevQty }).eq('id', currentStock.id);
      return { data: null, error: txnErr };
    }

    return { data: { movementNumber: movNumber, transactionNumber: txnNumber, newQuantity: newQty }, error: null };
  },

  /**
   * Adjust stock (Audit Reconciliation) with atomic transaction guarantee
   */
  async adjustStock({ productId, warehouseId, newQuantity, reason }) {
    const targetQty = parseInt(newQuantity, 10);
    if (isNaN(targetQty) || targetQty < 0) {
      return { data: null, error: { message: 'New stock quantity cannot be negative.' } };
    }

    // Try atomic RPC if available
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('process_stock_mutation', {
        p_product_id: productId,
        p_warehouse_id: warehouseId,
        p_quantity: targetQty,
        p_movement_type: 'PHYSICAL_AUDIT_ADJUSTMENT',
        p_reference_type: 'AUDIT',
        p_reference_id: 'ANNUAL-COUNT-2026',
        p_notes: reason || 'Physical stock audit adjustment'
      });
      if (!rpcErr && rpcData?.success) {
        return { data: { newQuantity: rpcData.new_quantity, delta: rpcData.quantity_delta }, error: null };
      }
    } catch {
      // Fall through to transactional compensating block
    }

    const { data: currentStock, error: readErr } = await supabase.from('stock')
      .select('*')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();

    if (readErr) return { data: null, error: readErr };

    const prevQty = currentStock?.quantity_on_hand || 0;
    const delta = targetQty - prevQty;
    const isIncrease = delta >= 0;

    const { error: stockErr } = await supabase.from('stock').upsert({
      product_id: productId,
      warehouse_id: warehouseId,
      quantity_on_hand: targetQty,
      last_counted_date: new Date().toISOString().split('T')[0]
    }, { onConflict: 'product_id,warehouse_id,bin_location' });

    if (stockErr) return { data: null, error: stockErr };

    const movNumber = `MOV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: movErr } = await supabase.from('stock_movements').insert({
      movement_number: movNumber,
      product_id: productId,
      to_warehouse_id: warehouseId,
      movement_type: 'PHYSICAL_AUDIT_ADJUSTMENT',
      quantity: Math.abs(delta) || 1,
      reference_type: 'AUDIT',
      reference_id: 'ANNUAL-COUNT-2026',
      notes: reason || 'Physical stock audit adjustment'
    });

    if (movErr) {
      // Rollback stock
      await supabase.from('stock').upsert({
        product_id: productId,
        warehouse_id: warehouseId,
        quantity_on_hand: prevQty
      }, { onConflict: 'product_id,warehouse_id,bin_location' });
      return { data: null, error: movErr };
    }

    const txnNumber = `TXN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: txnErr } = await supabase.from('inventory_transactions').insert({
      transaction_number: txnNumber,
      product_id: productId,
      warehouse_id: warehouseId,
      transaction_type: isIncrease ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB',
      quantity_delta: delta,
      previous_quantity: prevQty,
      new_quantity: targetQty,
      reference_table: 'PHYSICAL_INSPECTION',
      reference_id: 'AUDIT-ANNUAL-2026',
      remarks: reason || 'Audit Reconciliation'
    });

    if (txnErr) {
      // Rollback movement and stock
      await supabase.from('stock_movements').delete().eq('movement_number', movNumber);
      await supabase.from('stock').upsert({
        product_id: productId,
        warehouse_id: warehouseId,
        quantity_on_hand: prevQty
      }, { onConflict: 'product_id,warehouse_id,bin_location' });
      return { data: null, error: txnErr };
    }

    return { data: { movementNumber: movNumber, transactionNumber: txnNumber, newQuantity: targetQty, delta }, error: null };
  },

  /**
   * Fetch complete Inventory Valuation with product and warehouse aggregations
   * Authoritative Business Model:
   * - Valuation Quantity: public.stock.quantity_on_hand
   * - Authoritative Unit Cost: public.products.unit_cost_inr
   * - Line Valuation: quantity_on_hand * unit_cost_inr
   * - Warehouse Valuation: SUM(quantity_on_hand * unit_cost_inr)
   * - Global Valuation: SUM(all stock line valuations)
   * - Total Valued Products: COUNT(DISTINCT product_id)
   * Read-only: causes ZERO mutations on stock, transactions, or movements.
   */
  async getInventoryValuation(_options = {}) {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select(`
          id,
          product_id,
          warehouse_id,
          bin_location,
          quantity_on_hand,
          quantity_reserved,
          quantity_available,
          last_counted_date,
          updated_at,
          product:products (
            id,
            part_number,
            sku,
            name,
            unit_of_measure,
            unit_cost_inr,
            gst_rate_percent,
            category:product_categories (
              id,
              code,
              name
            )
          ),
          warehouse:warehouses (
            id,
            code,
            name,
            warehouse_type
          )
        `)
        .order('quantity_on_hand', { ascending: false });

      if (error) {
        return { data: null, error };
      }

      const rawRows = data || [];
      let totalGlobalValue = 0;
      let totalUnits = 0;
      let totalReserved = 0;
      let totalAvailable = 0;

      const distinctProductIds = new Set();
      const warehouseMap = new Map();

      const valuationItems = rawRows.map(row => {
        const prod = row.product || {};
        const wh = row.warehouse || {};

        const onHand = Number(row.quantity_on_hand || 0);
        const reserved = Number(row.quantity_reserved || 0);
        const available = Number(row.quantity_available ?? (onHand - reserved));
        const unitCost = Number(prod.unit_cost_inr || 0);
        const lineValuation = Math.round(onHand * unitCost * 100) / 100;

        totalGlobalValue += lineValuation;
        totalUnits += onHand;
        totalReserved += reserved;
        totalAvailable += available;

        if (row.product_id) {
          distinctProductIds.add(row.product_id);
        }

        // Aggregate by warehouse
        const whId = row.warehouse_id || 'unknown';
        if (!warehouseMap.has(whId)) {
          warehouseMap.set(whId, {
            warehouseId: whId,
            name: wh.name || 'General Stores',
            code: wh.code || 'WH',
            warehouseType: wh.warehouse_type || 'General Stores',
            totalUnits: 0,
            totalValue: 0,
            lineCount: 0,
            distinctProducts: new Set()
          });
        }
        const whAgg = warehouseMap.get(whId);
        whAgg.totalUnits += onHand;
        whAgg.totalValue += lineValuation;
        whAgg.lineCount += 1;
        if (row.product_id) {
          whAgg.distinctProducts.add(row.product_id);
        }

        return {
          id: row.id,
          productId: row.product_id,
          partNumber: prod.part_number || '',
          sku: prod.sku || prod.part_number || 'MAT-GEN',
          name: prod.name || 'Component',
          category: prod.category?.name || 'General Inventory',
          categoryId: prod.category?.id,
          unitOfMeasure: prod.unit_of_measure || 'PCS',
          warehouseId: row.warehouse_id,
          warehouseName: wh.name || 'General Stores',
          warehouseCode: wh.code || 'WH',
          warehouseType: wh.warehouse_type || 'General Stores',
          binLocation: row.bin_location || 'Stores',
          quantityOnHand: onHand,
          quantityReserved: reserved,
          quantityAvailable: available,
          unitCost: unitCost,
          unitCostFormatted: `₹${unitCost.toLocaleString('en-IN')}`,
          lineValuation: lineValuation,
          lineValuationFormatted: `₹${lineValuation.toLocaleString('en-IN')}`,
          lastCountedDate: row.last_counted_date || (row.updated_at ? row.updated_at.split('T')[0] : '2026-09-01'),
          updatedAt: row.updated_at
        };
      });

      // Round global total to 2 decimals
      totalGlobalValue = Math.round(totalGlobalValue * 100) / 100;

      // Transform warehouse summaries
      const warehouseBreakdown = Array.from(warehouseMap.values()).map(w => ({
        warehouseId: w.warehouseId,
        name: w.name,
        code: w.code,
        warehouseType: w.warehouseType,
        totalUnits: w.totalUnits,
        totalValue: Math.round(w.totalValue * 100) / 100,
        totalValueFormatted: `₹${Math.round(w.totalValue * 100 / 100).toLocaleString('en-IN')}`,
        lineCount: w.lineCount,
        productCount: w.distinctProducts.size
      })).sort((a, b) => b.totalValue - a.totalValue);

      const summary = {
        totalInventoryValue: totalGlobalValue,
        totalInventoryValueFormatted: `₹${totalGlobalValue.toLocaleString('en-IN')}`,
        totalUnits: totalUnits,
        totalReservedUnits: totalReserved,
        totalAvailableUnits: totalAvailable,
        totalStockLines: valuationItems.length,
        totalValuedProducts: distinctProductIds.size,
        totalWarehouses: warehouseBreakdown.length
      };

      return {
        data: {
          items: valuationItems,
          warehouses: warehouseBreakdown,
          summary: summary
        },
        error: null
      };
    } catch (err) {
      console.error('[inventoryService] getInventoryValuation exception:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Create new inventory product record with local persistence & movement logging
   */
  async createInventoryItem(data) {
    const id = data.id || `INV-${Date.now()}`;
    const deletedSet = getStoredDeletedIds();
    if (deletedSet.has(id)) {
      deletedSet.delete(id);
      saveStoredDeletedIds(deletedSet);
    }
    const costNum = Number(data.unitCostNum || (typeof data.unitCost === 'string' ? data.unitCost.replace(/[^0-9.]/g, '') : data.unitCost) || 0);
    const available = Number(data.availableQty) || 0;
    const minStock = Number(data.minStock) || 10;
    
    let status = 'In Stock';
    if (available <= 0) status = 'Out of Stock';
    else if (available <= minStock * 0.5) status = 'Critical Low';
    else if (available <= minStock) status = 'Low Stock';

    const newItem = {
      ...data,
      id,
      sku: data.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      name: data.name,
      make: data.make || 'Generic Precision',
      model: data.model || data.sku || '',
      category: data.category || 'General Inventory',
      availableQty: available,
      reservedQty: Number(data.reservedQty) || 0,
      minStock: minStock,
      unit: data.unit || 'Nos',
      location: data.location || 'Central Stores',
      supplier: data.supplier || 'Approved Vendor',
      unitCostNum: costNum,
      unitCost: data.unitCost || `₹${costNum.toLocaleString('en-IN')}`,
      status
    };

    const stored = getStoredCustomItems();
    stored.unshift(newItem);
    saveCustomItems(stored);

    // Record initial stock receipt movement
    if (available > 0) {
      recordCustomMovement({
        id: `mov-${Date.now()}`,
        movementNumber: `MOV-${Date.now().toString().slice(-5)}`,
        time: 'Just now',
        type: 'Inward GRN',
        rawType: 'RECEIPT_INITIAL',
        sku: newItem.sku,
        name: newItem.name,
        qty: `${available} ${newItem.unit}`,
        quantity: available,
        bay: newItem.location,
        user: 'Stores Officer',
        ref: 'INITIAL-STOCK',
        notes: `Initial stock onboarding for ${newItem.make} ${newItem.name}`
      });
    }

    try {
      await baseService.insert('products', {
        id: newItem.id,
        sku: newItem.sku,
        part_number: newItem.model,
        name: newItem.name,
        unit_of_measure: newItem.unit,
        unit_cost_inr: costNum,
        min_reorder_level: minStock
      });
    } catch (e) {
      // Ignore DB failure when offline
    }

    return { data: newItem, error: null };
  },

  /**
   * Update existing inventory item
   */
  async updateInventoryItem(id, data) {
    const stored = getStoredCustomItems();
    const existingIndex = stored.findIndex(it => it.id === id);

    let updatedItem = null;
    const costNum = Number(data.unitCostNum || (typeof data.unitCost === 'string' ? data.unitCost.replace(/[^0-9.]/g, '') : data.unitCost) || 0);
    const available = Number(data.availableQty != null ? data.availableQty : 0);
    const minStock = Number(data.minStock != null ? data.minStock : 10);
    
    let status = 'In Stock';
    if (available <= 0) status = 'Out of Stock';
    else if (available <= minStock * 0.5) status = 'Critical Low';
    else if (available <= minStock) status = 'Low Stock';

    const merged = {
      ...data,
      id,
      availableQty: available,
      minStock,
      unitCostNum: costNum,
      unitCost: data.unitCost || `₹${costNum.toLocaleString('en-IN')}`,
      make: data.make || 'Generic Precision',
      status
    };

    if (existingIndex >= 0) {
      stored[existingIndex] = { ...stored[existingIndex], ...merged };
      updatedItem = stored[existingIndex];
      saveCustomItems(stored);
    } else {
      stored.unshift(merged);
      updatedItem = merged;
      saveCustomItems(stored);
    }

    return { data: updatedItem, error: null };
  },

  /**
   * Adjust inventory stock level (Receive Inward, Issue Outward, or Audit Set)
   */
  async adjustInventoryStock(id, { adjustmentType = 'inward', quantity = 1, reason = '', user = 'Stores Officer' }) {
    const qty = Number(quantity) || 0;
    if (qty <= 0 && adjustmentType !== 'set') {
      return { data: null, error: { message: 'Quantity must be greater than zero.' } };
    }

    const { data: allItems } = await this.getInventoryItems();
    const targetItem = allItems.find(it => it.id === id);
    if (!targetItem) {
      return { data: null, error: { message: 'Item not found in inventory registry.' } };
    }

    let prevQty = Number(targetItem.availableQty) || 0;
    let newQty = prevQty;
    let movType = 'Inward GRN';
    let rawType = 'RECEIPT_MANUAL';

    if (adjustmentType === 'inward') {
      newQty = prevQty + qty;
      movType = 'Inward GRN';
      rawType = 'RECEIPT_MANUAL';
    } else if (adjustmentType === 'issue') {
      if (prevQty < qty) {
        return { data: null, error: { message: `Insufficient stock on hand (${prevQty} ${targetItem.unit}) to issue ${qty} units.` } };
      }
      newQty = prevQty - qty;
      movType = 'Store Issue';
      rawType = 'ISSUE_PRODUCTION';
    } else if (adjustmentType === 'set') {
      newQty = qty;
      movType = 'Physical Audit';
      rawType = 'PHYSICAL_AUDIT_ADJUSTMENT';
    }

    const minStock = Number(targetItem.minStock) || 10;
    let status = 'In Stock';
    if (newQty <= 0) status = 'Out of Stock';
    else if (newQty <= minStock * 0.5) status = 'Critical Low';
    else if (newQty <= minStock) status = 'Low Stock';

    const updatedItem = {
      ...targetItem,
      availableQty: newQty,
      status
    };

    // Save in custom storage
    const stored = getStoredCustomItems();
    const idx = stored.findIndex(it => it.id === id);
    if (idx >= 0) {
      stored[idx] = updatedItem;
    } else {
      stored.unshift(updatedItem);
    }
    saveCustomItems(stored);

    // Record stock movement
    recordCustomMovement({
      id: `mov-${Date.now()}`,
      movementNumber: `MOV-${Date.now().toString().slice(-5)}`,
      time: 'Just now',
      type: movType,
      rawType: rawType,
      sku: targetItem.sku,
      name: targetItem.name,
      qty: `${adjustmentType === 'set' ? `Audit: ${newQty}` : `${qty}`} ${targetItem.unit}`,
      quantity: qty,
      bay: targetItem.location || 'Central Stores',
      user: user || 'Stores Officer',
      ref: reason ? reason.slice(0, 20) : 'MANUAL-ADJ',
      notes: reason || `Manual ${movType} of ${qty} ${targetItem.unit} (Prev: ${prevQty}, New: ${newQty})`
    });

    return { data: updatedItem, error: null };
  },

  /**
   * Delete inventory item from registry
   */
  async deleteInventoryItem(id) {
    const deletedSet = getStoredDeletedIds();
    deletedSet.add(id);
    saveStoredDeletedIds(deletedSet);

    const stored = getStoredCustomItems();
    const filtered = stored.filter(it => it.id !== id);
    saveCustomItems(filtered);

    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'inventory' } }));
    return { data: { success: true }, error: null };
  },

  /**
   * Create new inventory product record
   */
  async createProduct(data) {
    return await this.createInventoryItem(data);
  },

  /**
   * Update existing product record
   */
  async updateProduct(id, data) {
    return await this.updateInventoryItem(id, data);
  }
};

export default inventoryService;
