import { baseService } from './baseService';
import { SUPPLIERS } from '../../data/mockData';

const LOCAL_STORAGE_KEY = 'gps_erp_custom_suppliers';

/**
 * Get locally stored custom suppliers created by users
 */
export function getStoredCustomSuppliers() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Persist custom supplier and dispatch sync event
 */
export function saveCustomSupplier(supplier) {
  try {
    const existing = getStoredCustomSuppliers();
    const filtered = existing.filter(s => (s.id !== supplier.id && s.name.toLowerCase() !== supplier.name.toLowerCase()));
    const updated = [supplier, ...filtered];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gps_entities_updated', { 
        detail: { entity: 'suppliers', supplierId: supplier.id, supplierName: supplier.name } 
      }));
    }
  } catch (e) {
    console.warn('[supplierService] Failed to save supplier locally:', e);
  }
}

/**
 * Delete supplier from local storage
 */
export function deleteStoredSupplier(id) {
  try {
    const existing = getStoredCustomSuppliers();
    const updated = existing.filter(s => s.id !== id && s.supplier_code !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gps_entities_updated', { 
        detail: { entity: 'suppliers', supplierId: id, action: 'delete' } 
      }));
    }
  } catch (e) {
    console.warn('[supplierService] Failed to delete supplier locally:', e);
  }
}

/**
 * Supplier Domain Service
 * Encapsulates master data queries and mutations for Approved Vendors & Component Suppliers.
 */
export const supplierService = {
  /**
   * Fetch approved vendors list with optional filters and sorting
   */
  async getSuppliers(options = {}) {
    const customSuppliers = getStoredCustomSuppliers();

    // Attempt to fetch from Supabase if online
    let remoteData = [];
    try {
      const res = await baseService.select('suppliers', {
        orderBy: options.orderBy || 'name',
        ascending: options.ascending ?? true,
        ...options
      });
      if (res && res.data && res.data.length > 0) {
        remoteData = res.data;
      }
    } catch (e) {
      console.warn('[supplierService] Supabase suppliers query fallback:', e);
    }

    // Combine custom suppliers, remote data, and mock data
    const map = new Map();

    // 1. Add base mock data
    SUPPLIERS.forEach(s => {
      map.set(s.name.toLowerCase().trim(), { ...s });
    });

    // 2. Override with remote data if available
    remoteData.forEach(r => {
      const nameKey = (r.name || '').toLowerCase().trim();
      const existing = map.get(nameKey) || {};
      map.set(nameKey, {
        ...existing,
        ...r,
        id: r.supplier_code || r.id || existing.id,
        supplier_code: r.supplier_code || existing.supplier_code,
        name: r.name || existing.name,
        category: r.categories_supplied || r.category || existing.category,
        location: `${r.city || ''}, ${r.country || 'India'}`.replace(/^,\s*|,\s*$/g, '') || r.address || existing.location,
        leadTime: r.lead_time_days ? `${r.lead_time_days} days` : (existing.leadTime || '14 Days'),
        rating: r.rating ? (typeof r.rating === 'number' ? `${r.rating.toFixed(2)} / 5.00 Quality` : r.rating) : existing.rating,
        contact_person: r.contact_person || existing.contact_person,
        email: r.email || existing.email,
        phone: r.phone || existing.phone,
        gstin: r.gstin || existing.gstin,
        address: r.address || existing.address,
        placeOfSupply: r.state || existing.placeOfSupply || '27-Maharashtra',
        status: r.status || existing.status || 'Approved'
      });
    });

    // 3. Override with custom created / edited suppliers (highest precedence)
    customSuppliers.forEach(c => {
      const nameKey = (c.name || '').toLowerCase().trim();
      map.set(nameKey, { ...c });
    });

    const combined = Array.from(map.values());

    return {
      data: combined,
      error: null,
      count: combined.length
    };
  },

  /**
   * Fetch single supplier by ID or Code
   */
  async getSupplierById(id) {
    const listRes = await this.getSuppliers();
    const match = (listRes.data || []).find(s => s.id === id || s.supplier_code === id);
    return {
      data: match || null,
      error: match ? null : { message: 'Supplier not found' }
    };
  },

  /**
   * Create a new approved supplier record
   */
  async createSupplier(data) {
    const customList = getStoredCustomSuppliers();
    const count = SUPPLIERS.length + customList.length + 1;
    const generatedCode = data.supplier_code || `SUPP-${String(count).padStart(2, '0')}`;

    const newSupplier = {
      id: generatedCode,
      supplier_code: generatedCode,
      name: data.name.trim(),
      category: data.category || 'Precision Spindle Bearings & Components',
      location: data.location || `${data.city || 'Pune'}, ${data.state || 'Maharashtra'}`,
      city: data.city || 'Pune',
      state: data.state || data.placeOfSupply || '27-Maharashtra',
      placeOfSupply: data.placeOfSupply || data.state || '27-Maharashtra',
      address: data.address || `${data.city || 'Pune'}, Maharashtra, India`,
      leadTime: data.leadTime || '1-2 Weeks',
      lead_time_days: Number(data.lead_time_days) || 14,
      rating: data.rating || 'Grade A (99% Quality)',
      activePo: data.activePo || 'None',
      contact_person: data.contact_person || '',
      contact: data.contact_person ? `${data.contact_person} (${data.phone || ''})` : (data.email || ''),
      email: data.email || 'purchase@vendor.com',
      phone: data.phone || '',
      gstin: (data.gstin || '').toUpperCase(),
      paymentTerms: data.paymentTerms || 'Net 30 Days',
      status: data.status || 'Approved',
      createdAt: new Date().toISOString()
    };

    saveCustomSupplier(newSupplier);

    // Also attempt remote DB insert
    try {
      await baseService.insert('suppliers', {
        supplier_code: newSupplier.supplier_code,
        name: newSupplier.name,
        contact_person: newSupplier.contact_person,
        email: newSupplier.email,
        phone: newSupplier.phone,
        gstin: newSupplier.gstin,
        address: newSupplier.address,
        city: newSupplier.city,
        state: newSupplier.state,
        lead_time_days: newSupplier.lead_time_days,
        categories_supplied: [newSupplier.category],
        status: newSupplier.status
      });
    } catch (e) {
      console.warn('[supplierService] Remote DB insert fallback to local:', e);
    }

    return { data: [newSupplier], error: null };
  },

  /**
   * Automatically ensure vendor from a Purchase Order exists in Precision Vendors & Component Suppliers.
   * If existing: enriches any missing or updated contact/GSTIN/address.
   * If new: creates approved supplier record with SUPP-XX code, persists to localStorage & emits sync event.
   */
  async ensureSupplierFromPO(poData) {
    if (!poData) return null;
    const vendorName = (poData.supplier || poData.supplierName || '').trim();
    if (!vendorName) return null;

    const listRes = await this.getSuppliers();
    const allSuppliers = listRes.data || [];

    const norm = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanVendorName = norm(vendorName);
    const cleanGstin = norm(poData.supplierGstin);

    // Find if vendor already exists (by normalized GSTIN or normalized Name)
    const existing = allSuppliers.find(s => {
      const sGstin = norm(s.gstin);
      const sName = norm(s.name);
      if (cleanGstin && sGstin && cleanGstin === sGstin) return true;
      if (cleanVendorName && sName && (cleanVendorName === sName || cleanVendorName.includes(sName) || sName.includes(cleanVendorName))) return true;
      return false;
    });

    const contactNo = poData.supplierContact || poData.supplierPhone || '';
    const email = poData.supplierEmail || existing?.email || 'purchase@vendor.com';
    const address = poData.supplierAddress || existing?.address || 'Pune, Maharashtra, India';
    const gstin = (poData.supplierGstin || existing?.gstin || '').toUpperCase();
    const placeOfSupply = poData.placeOfSupply || existing?.placeOfSupply || existing?.state || '27-Maharashtra';

    // Infer category from items if available
    let inferredCategory = 'Precision Spindle Bearings & Components';
    if (poData.items && poData.items.length > 0) {
      const allItemText = poData.items.map(it => `${it.item || ''} ${it.desc || ''} ${it.name || ''}`).join(' ').toLowerCase();
      if (allItemText.includes('bearing') || allItemText.includes('ball') || allItemText.includes('roller')) {
        inferredCategory = 'Precision Spindle Bearings (P4S / Ceramic)';
      } else if (allItemText.includes('encoder') || allItemText.includes('sensor') || allItemText.includes('optical')) {
        inferredCategory = 'High-Resolution Encoders & Sensors';
      } else if (allItemText.includes('steel') || allItemText.includes('alloy') || allItemText.includes('bar') || allItemText.includes('plate')) {
        inferredCategory = 'Precision Alloy Steels & Raw Materials';
      } else if (allItemText.includes('drawbar') || allItemText.includes('collet') || allItemText.includes('clamping') || allItemText.includes('gripper')) {
        inferredCategory = 'Automatic Tool Clamping & Drawbars';
      } else if (allItemText.includes('tool') || allItemText.includes('carbide') || allItemText.includes('insert') || allItemText.includes('mill')) {
        inferredCategory = 'Precision Cutting Tools & Carbide Inserts';
      } else if (poData.items[0]?.desc || poData.items[0]?.item) {
        const desc = (poData.items[0].desc || poData.items[0].item).trim();
        inferredCategory = desc.length > 40 ? desc.substring(0, 40) + '...' : desc;
      }
    }

    if (existing) {
      const updated = {
        ...existing,
        contact_person: existing.contact_person || poData.supplierContact || existing.name,
        contact: contactNo || existing.contact,
        phone: contactNo || existing.phone,
        email: email || existing.email,
        gstin: gstin || existing.gstin,
        address: address || existing.address,
        placeOfSupply: placeOfSupply,
        state: placeOfSupply,
        activePo: poData.poNumber || existing.activePo || 'Active'
      };
      saveCustomSupplier(updated);
      return updated;
    } else {
      const existingCodes = allSuppliers
        .map(s => s.supplier_code || s.id || '')
        .filter(c => /^SUPP-\d+$/i.test(c))
        .map(c => parseInt(c.replace(/[^0-9]/g, ''), 10));
      const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : allSuppliers.length;
      const generatedCode = `SUPP-${String(maxCode + 1).padStart(2, '0')}`;

      // Extract city from address
      let city = 'Pune';
      if (address) {
        const parts = address.split(',').map(p => p.trim());
        if (parts.length > 1) {
          const possibleCity = parts[parts.length - 2].replace(/\d+/g, '').trim();
          if (possibleCity) city = possibleCity;
        }
      }

      const newSupplier = {
        id: generatedCode,
        supplier_code: generatedCode,
        name: vendorName,
        category: inferredCategory,
        location: `${city}, ${placeOfSupply.replace(/^\d+-/, '') || 'Maharashtra'}`,
        city: city,
        state: placeOfSupply,
        placeOfSupply: placeOfSupply,
        address: address,
        leadTime: '1-2 Weeks',
        lead_time_days: 14,
        rating: 'Grade A (99% Quality)',
        activePo: poData.poNumber || 'Active',
        contact_person: poData.supplierContact || vendorName,
        contact: contactNo || `${vendorName} Sales`,
        email: email,
        phone: contactNo,
        gstin: gstin,
        paymentTerms: poData.paymentTerms || 'Due on Receipt',
        status: 'Approved',
        createdAt: new Date().toISOString()
      };

      saveCustomSupplier(newSupplier);

      try {
        await baseService.insert('suppliers', {
          supplier_code: newSupplier.supplier_code,
          name: newSupplier.name,
          contact_person: newSupplier.contact_person,
          email: newSupplier.email,
          phone: newSupplier.phone,
          gstin: newSupplier.gstin,
          address: newSupplier.address,
          city: newSupplier.city,
          state: newSupplier.state,
          lead_time_days: newSupplier.lead_time_days,
          categories_supplied: [newSupplier.category],
          status: newSupplier.status
        });
      } catch (e) {
        console.warn('[supplierService] Remote DB insert fallback:', e);
      }

      return newSupplier;
    }
  },

  /**
   * Update existing supplier record
   */
  async updateSupplier(id, data) {
    const listRes = await this.getSuppliers();
    const existing = (listRes.data || []).find(s => s.id === id || s.supplier_code === id) || {};

    const updated = {
      ...existing,
      ...data,
      id: id,
      supplier_code: data.supplier_code || existing.supplier_code || id,
      name: (data.name || existing.name).trim(),
      category: data.category || existing.category,
      location: data.location || existing.location,
      city: data.city || existing.city,
      state: data.state || existing.state || '27-Maharashtra',
      placeOfSupply: data.placeOfSupply || existing.placeOfSupply || '27-Maharashtra',
      address: data.address || existing.address,
      leadTime: data.leadTime || existing.leadTime,
      lead_time_days: data.lead_time_days != null ? Number(data.lead_time_days) : existing.lead_time_days,
      rating: data.rating || existing.rating,
      contact_person: data.contact_person != null ? data.contact_person : existing.contact_person,
      email: data.email || existing.email,
      phone: data.phone != null ? data.phone : existing.phone,
      gstin: data.gstin != null ? data.gstin.toUpperCase() : existing.gstin,
      paymentTerms: data.paymentTerms || existing.paymentTerms,
      status: data.status || existing.status || 'Approved',
      updatedAt: new Date().toISOString()
    };

    saveCustomSupplier(updated);

    try {
      await baseService.update('suppliers', id, {
        name: updated.name,
        contact_person: updated.contact_person,
        email: updated.email,
        phone: updated.phone,
        gstin: updated.gstin,
        address: updated.address,
        city: updated.city,
        state: updated.state,
        status: updated.status
      });
    } catch (e) {
      console.warn('[supplierService] Remote DB update fallback to local:', e);
    }

    return { data: [updated], error: null };
  },

  /**
   * Delete supplier record
   */
  async deleteSupplier(id) {
    deleteStoredSupplier(id);
    try {
      await baseService.delete('suppliers', id);
    } catch (e) {}
    return { data: true, error: null };
  }
};

export default supplierService;
