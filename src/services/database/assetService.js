import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Plant Asset Registry Domain Service
 * Manages CNC Machine Tools, Balancing Benches, Metrology Equipment,
 * Tooling Stands, and Asset Health Status.
 */
export const assetService = {
  /**
   * Fetch all registered plant assets joined with bay location
   */
  async getAssets(options = {}) {
    const res = await baseService.select('assets', {
      select: `
        id,
        asset_tag,
        name,
        category,
        bay_id,
        purchase_date,
        purchase_cost,
        calibration_cycle_days,
        status,
        created_at,
        bay:production_bays(id, code, name)
      `,
      orderBy: options.orderBy || 'asset_tag',
      ascending: options.ascending ?? true,
      ...options
    });

    if (res.error) return res;

    // Normalize for clean UI display
    const normalized = (res.data || []).map(a => ({
      id: a.asset_tag || a.id,
      dbId: a.id,
      assetTag: a.asset_tag,
      name: a.name,
      category: a.category,
      bay: a.bay?.name || 'Shop Floor Central',
      bayId: a.bay_id,
      purchaseDate: a.purchase_date,
      costFormatted: a.purchase_cost ? `₹${Number(a.purchase_cost).toLocaleString('en-IN')}` : '₹0',
      purchaseCost: Number(a.purchase_cost || 0),
      calibrationCycleDays: a.calibration_cycle_days || 180,
      status: a.status || 'Active',
      createdAt: a.created_at
    }));

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Fetch a single asset with full maintenance logs
   */
  async getAssetById(identifier) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const filter = isUuid ? { id: identifier } : { asset_tag: identifier };

    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        bay:production_bays(id, code, name),
        maintenance_orders:maintenance_orders(*),
        maintenance_history:maintenance_history(*)
      `)
      .match(filter)
      .limit(1);

    if (error) return { data: null, error };
    return { data: data?.[0] || null, error: null };
  },

  /**
   * Register a new plant asset
   */
  async createAsset(assetData) {
    const assetTag = assetData.asset_tag || `AST-${assetData.category?.slice(0, 3).toUpperCase() || 'EQP'}-${Math.floor(100 + Math.random() * 900)}`;
    const record = {
      asset_tag: assetTag,
      name: assetData.name,
      category: assetData.category || 'Precision Machine Tool',
      bay_id: assetData.bay_id || null,
      purchase_date: assetData.purchase_date || new Date().toISOString().split('T')[0],
      purchase_cost: assetData.purchase_cost || 0,
      calibration_cycle_days: assetData.calibration_cycle_days || 180,
      status: assetData.status || 'Active'
    };

    return await baseService.insert('assets', record);
  },

  /**
   * Update asset attributes
   */
  async updateAsset(id, data) {
    return await baseService.update('assets', id, data);
  },

  /**
   * Update asset operational status
   */
  async updateAssetStatus(id, newStatus) {
    return await baseService.update('assets', id, { status: newStatus });
  }
};
