import { baseService } from './baseService';

/**
 * Customer Domain Service
 * Encapsulates master data queries and mutations for Customers & Customer Contacts.
 */
export const customerService = {
  /**
   * Fetch customer accounts list with optional filters and sorting
   */
  async getCustomers(options = {}) {
    return await baseService.select('customers', {
      orderBy: options.orderBy || 'company_name',
      ascending: options.ascending ?? true,
      ...options
    });
  },

  /**
   * Fetch single customer by UUID
   */
  async getCustomerById(id) {
    const res = await baseService.select('customers', { eq: { id } });
    return {
      data: res.data?.[0] || null,
      error: res.error,
      latencyMs: res.latencyMs
    };
  },

  /**
   * Create a new customer master record
   */
  async createCustomer(data) {
    return await baseService.insert('customers', data);
  },

  /**
   * Update existing customer record
   */
  async updateCustomer(id, data) {
    return await baseService.update('customers', id, data);
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
  }
};

export default customerService;
