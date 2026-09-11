import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';
import { INTERNAL_GPS_CCS } from '../../data/contactsData';

/**
 * Contact Domain Service
 * Provides access to customer contacts, supplier vendor contacts, and internal CC lists.
 */
export const contactService = {
  /**
   * Fetch customer contacts joined with customer account info
   */
  async getCustomerContacts(customerId = null) {
    const options = {
      select: 'id, customer_id, name, email, phone, designation, department, is_primary, is_default_cc, customers(id, customer_code, company_name, gstin, city, state)',
      orderBy: 'name',
      ascending: true
    };
    if (customerId) {
      options.eq = { customer_id: customerId };
    }
    return await baseService.select('customer_contacts', options);
  },

  /**
   * Fetch supplier contacts from suppliers master table
   */
  async getSupplierContacts(supplierId = null) {
    const options = {
      select: 'id, supplier_code, name, contact_person, email, phone, city, categories_supplied, rating',
      orderBy: 'name',
      ascending: true
    };
    if (supplierId) {
      options.eq = { id: supplierId };
    }
    return await baseService.select('suppliers', options);
  },

  /**
   * Fetch all unified contact directories (Customers & Suppliers)
   */
  async getContacts() {
    const [custContactsRes, suppliersRes] = await Promise.all([
      this.getCustomerContacts(),
      this.getSupplierContacts()
    ]);

    const error = custContactsRes.error || suppliersRes.error;
    if (error) {
      return { data: [], error, isMock: false };
    }

    return {
      data: {
        customerContacts: custContactsRes.data || [],
        suppliers: suppliersRes.data || []
      },
      error: null,
      isMock: false
    };
  },

  /**
   * Fetch unified contacts directory formatted for ContactsScreen
   */
  async getUnifiedDirectory() {
    const [custRes, contactsRes, suppliersRes] = await Promise.all([
      baseService.select('customers', { orderBy: 'company_name', ascending: true }),
      baseService.select('customer_contacts', { orderBy: 'is_primary', ascending: false }),
      baseService.select('suppliers', { orderBy: 'name', ascending: true })
    ]);

    if (custRes.error || contactsRes.error || suppliersRes.error) {
      const error = custRes.error || contactsRes.error || suppliersRes.error;
      return { data: [], error, isMock: false };
    }

    const contactsByCustomer = new Map();
    (contactsRes.data || []).forEach(cnt => {
      if (!contactsByCustomer.has(cnt.customer_id)) {
        contactsByCustomer.set(cnt.customer_id, []);
      }
      contactsByCustomer.get(cnt.customer_id).push(cnt);
    });

    const unifiedList = [];

    // 1. Map customers
    (custRes.data || []).forEach((c, idx) => {
      const cContacts = contactsByCustomer.get(c.id) || [];
      const primary = cContacts.find(cnt => cnt.is_primary) || cContacts[0] || {
        name: c.primary_contact_name || 'Commercial Sourcing Lead',
        email: c.primary_email || 'orders@client.com',
        phone: c.primary_phone || '+91 20 6791 4200',
        designation: 'Procurement Manager',
        department: 'Procurement'
      };

      const secondary = cContacts.find(cnt => !cnt.is_primary && !cnt.is_default_cc) || cContacts[1] || null;
      const ccList = cContacts.filter(cnt => cnt.is_default_cc || (!cnt.is_primary && cnt !== secondary)).map(cnt => ({
        label: cnt.name,
        role: cnt.designation || 'Accounts / QC',
        email: cnt.email,
        dept: cnt.department || 'Procurement'
      }));

      unifiedList.push({
        id: `CNT-${String(idx + 1).padStart(3, '0')}`,
        dbId: c.id,
        companyId: c.customer_code,
        companyName: c.company_name,
        category: 'Customer',
        tier: c.industry_segment ? `Tier 1 - ${c.industry_segment}` : 'Tier 1 Enterprise Client',
        location: `${c.city || ''}, ${c.state || ''}`.replace(/^,\s*|,\s*$/g, '') || c.billing_address || 'Pune, Maharashtra',
        gstin: c.gstin,
        primaryContact: {
          name: primary.name,
          designation: primary.designation || 'Materials Manager',
          department: primary.department || 'Procurement',
          email: primary.email,
          phone: primary.phone,
          isPrimary: true
        },
        secondaryContact: secondary ? {
          name: secondary.name,
          designation: secondary.designation || 'Quality Inspection Lead',
          department: secondary.department || 'Quality QA',
          email: secondary.email,
          phone: secondary.phone
        } : null,
        ccList: ccList.length > 0 ? ccList : [
          { label: 'Accounts Payable', role: 'Invoicing & Payments', email: `accounts@${primary.email?.split('@')[1] || 'client.com'}`, dept: 'Finance' },
          { label: 'Plant Maintenance Head', role: 'Spindle Health Oversight', email: `plant.head@${primary.email?.split('@')[1] || 'client.com'}`, dept: 'Maintenance' }
        ],
        notes: `Enterprise customer account (${c.customer_code}). Payment terms: ${c.payment_terms || 'Net 30 Days'}.`
      });
    });

    // 2. Map suppliers
    (suppliersRes.data || []).forEach((s, idx) => {
      unifiedList.push({
        id: `SUP-CNT-${String(idx + 1).padStart(3, '0')}`,
        dbId: s.id,
        companyId: s.supplier_code,
        companyName: s.name,
        category: 'Supplier',
        tier: 'Approved OEM Vendor',
        location: `${s.city || ''}, ${s.state || s.country || 'India'}`.replace(/^,\s*|,\s*$/g, ''),
        gstin: s.gstin || '27AAACS1094L1Z8',
        primaryContact: {
          name: s.contact_person || 'Sales Manager',
          designation: 'Vendor Technical Lead',
          department: 'OEM Sales',
          email: s.email,
          phone: s.phone,
          isPrimary: true
        },
        secondaryContact: null,
        ccList: [
          { label: 'Order Desk', role: 'Purchase Order Inward', email: s.email, dept: 'Sales' }
        ],
        notes: `Approved supplier vendor (${s.supplier_code}). Rating: ${s.rating || 5.0}.`
      });
    });

    return {
      data: unifiedList,
      error: null,
      isMock: false
    };
  },

  /**
   * Get internal GPS Spindle distribution email recipients
   */
  getInternalCcs() {
    return INTERNAL_GPS_CCS || [];
  },

  /**
   * Create customer contact
   */
  async createContact(contactData) {
    return await baseService.insert('customer_contacts', contactData);
  },

  /**
   * Update customer contact
   */
  async updateContact(id, contactData) {
    return await baseService.update('customer_contacts', id, contactData);
  },

  /**
   * Delete customer contact
   */
  async deleteContact(id) {
    return await baseService.delete('customer_contacts', id);
  }
};

export default contactService;
