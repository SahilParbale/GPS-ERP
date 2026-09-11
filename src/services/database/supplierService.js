import { baseService } from './baseService';

/**
 * Supplier Domain Service
 * Encapsulates master data queries and mutations for Approved Vendors & Suppliers.
 */
export const supplierService = {
  /**
   * Fetch approved vendors list with optional filters and sorting
   */
  async getSuppliers(options = {}) {
    return await baseService.select('suppliers', {
      orderBy: options.orderBy || 'name',
      ascending: options.ascending ?? true,
      ...options
    });
  },

  /**
   * Fetch single supplier by UUID
   */
  async getSupplierById(id) {
    const res = await baseService.select('suppliers', { eq: { id } });
    return {
      data: res.data?.[0] || null,
      error: res.error,
      latencyMs: res.latencyMs
    };
  },

  /**
   * Create a new approved supplier record
   */
  async createSupplier(data) {
    return await baseService.insert('suppliers', data);
  },

  /**
   * Update existing supplier record
   */
  async updateSupplier(id, data) {
    return await baseService.update('suppliers', id, data);
  }
};

export default supplierService;
