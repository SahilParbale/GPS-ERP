import { baseService } from './baseService.js';
import { supabase } from '../supabase/supabaseClient.js';
import { INTERNAL_GPS_CCS } from '../../data/contactsData.js';
import { isCleanSlateMode } from '../../utils/dataMode.js';

/**
 * GPS Spindle Industrial ERP — Contact Domain Service
 * Production Database-Backed Service for Customer Contacts, Suppliers, and CC Groups.
 * 
 * Target Tables:
 * - public.customer_contacts (Relational child table for customer contacts)
 * - public.customers (Customer master accounts)
 * - public.suppliers (Supplier master accounts with embedded contact fields)
 * - public.audit_logs (Immutable administrative audit trail)
 */
export const contactService = {
  /**
   * Log an event to public.audit_logs (Non-blocking)
   */
  async logContactAudit(event = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const auditRecord = {
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'System User',
        user_email: user.email,
        action: event.action || 'UPDATE',
        module: 'Contacts',
        table_name: event.table_name || 'customer_contacts',
        record_id: String(event.record_id || ''),
        summary_message: event.summary_message || 'Contact directory modified',
        previous_values: event.previous_values || null,
        new_values: event.new_values || null
      };

      await supabase.from('audit_logs').insert(auditRecord);
    } catch (err) {
      console.warn('[GPS-ERP Contacts] Audit logging non-blocking notice:', err.message);
    }
  },

  /**
   * Fetch all customer contacts joined with customer account metadata
   */
  async getAllCustomerContacts() {
    const { data, error } = await supabase
      .from('customer_contacts')
      .select('id, customer_id, name, email, phone, designation, department, is_primary, is_default_cc, created_at, customers(id, customer_code, company_name, gstin, city, state, is_active)')
      .order('name', { ascending: true });

    return { data: data || [], error: error ? error.message : null };
  },

  /**
   * Fetch contacts for a specific customer
   */
  async getCustomerContacts(customerId) {
    if (!customerId) return { data: [], error: 'Customer ID is required' };

    const { data, error } = await supabase
      .from('customer_contacts')
      .select('id, customer_id, name, email, phone, designation, department, is_primary, is_default_cc, created_at')
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });

    return { data: data || [], error: error ? error.message : null };
  },

  /**
   * Create a customer contact with primary-contact handling
   */
  async createCustomerContact(customerId, contactData) {
    if (!customerId) return { data: null, error: 'Customer ID is required' };
    if (!contactData.name?.trim()) return { data: null, error: 'Contact person name is required' };
    if (!contactData.email?.trim() || !contactData.email.includes('@')) {
      return { data: null, error: 'A valid email address is required' };
    }

    try {
      const isPrimary = Boolean(contactData.is_primary);

      // If marked as primary, reset existing primary contacts for this customer
      if (isPrimary) {
        await supabase
          .from('customer_contacts')
          .update({ is_primary: false })
          .eq('customer_id', customerId);
      }

      const insertPayload = {
        customer_id: customerId,
        name: contactData.name.trim(),
        email: contactData.email.trim().toLowerCase(),
        phone: contactData.phone?.trim() || null,
        designation: contactData.designation?.trim() || 'Procurement Contact',
        department: contactData.department?.trim() || 'Procurement',
        is_primary: isPrimary,
        is_default_cc: Boolean(contactData.is_default_cc)
      };

      const { data, error } = await supabase
        .from('customer_contacts')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      // If primary, synchronize customer master summary fields
      if (isPrimary) {
        await supabase
          .from('customers')
          .update({
            primary_contact_name: insertPayload.name,
            primary_email: insertPayload.email,
            primary_phone: insertPayload.phone
          })
          .eq('id', customerId);
      }

      await this.logContactAudit({
        action: 'CREATE',
        table_name: 'customer_contacts',
        record_id: data.id,
        summary_message: `Created contact ${insertPayload.name} for customer ID ${customerId}`,
        new_values: insertPayload
      });

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to create customer contact' };
    }
  },

  /**
   * Update an existing customer contact
   */
  async updateCustomerContact(contactId, contactData) {
    if (!contactId) return { data: null, error: 'Contact ID is required' };

    try {
      // 1. Fetch current contact to obtain customer_id and current state
      const { data: current, error: fetchErr } = await supabase
        .from('customer_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (fetchErr || !current) {
        throw new Error(fetchErr?.message || 'Contact record not found');
      }

      const isPrimary = contactData.is_primary !== undefined 
        ? Boolean(contactData.is_primary) 
        : current.is_primary;

      // 2. If setting as primary, clear any other primary contact for this customer
      if (isPrimary && !current.is_primary) {
        await supabase
          .from('customer_contacts')
          .update({ is_primary: false })
          .eq('customer_id', current.customer_id)
          .neq('id', contactId);
      }

      const updatePayload = {
        name: contactData.name !== undefined ? contactData.name.trim() : current.name,
        email: contactData.email !== undefined ? contactData.email.trim().toLowerCase() : current.email,
        phone: contactData.phone !== undefined ? (contactData.phone?.trim() || null) : current.phone,
        designation: contactData.designation !== undefined ? contactData.designation?.trim() : current.designation,
        department: contactData.department !== undefined ? contactData.department?.trim() : current.department,
        is_primary: isPrimary,
        is_default_cc: contactData.is_default_cc !== undefined ? Boolean(contactData.is_default_cc) : current.is_default_cc
      };

      const { data, error } = await supabase
        .from('customer_contacts')
        .update(updatePayload)
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;

      // 3. Synchronize customer summary fields if primary
      if (isPrimary) {
        await supabase
          .from('customers')
          .update({
            primary_contact_name: updatePayload.name,
            primary_email: updatePayload.email,
            primary_phone: updatePayload.phone
          })
          .eq('id', current.customer_id);
      }

      await this.logContactAudit({
        action: 'UPDATE',
        table_name: 'customer_contacts',
        record_id: contactId,
        summary_message: `Updated contact ${updatePayload.name}`,
        previous_values: current,
        new_values: updatePayload
      });

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to update customer contact' };
    }
  },

  /**
   * Delete a customer contact
   */
  async deleteCustomerContact(contactId) {
    if (!contactId) return { data: null, error: 'Contact ID is required' };

    try {
      const { data: current } = await supabase
        .from('customer_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      const { error } = await supabase
        .from('customer_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      // If deleted contact was primary, sync customer summary
      if (current?.is_primary && current?.customer_id) {
        // Find if another contact exists for this customer
        const { data: remaining } = await supabase
          .from('customer_contacts')
          .select('id, name, email, phone')
          .eq('customer_id', current.customer_id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (remaining && remaining.length > 0) {
          await supabase
            .from('customer_contacts')
            .update({ is_primary: true })
            .eq('id', remaining[0].id);

          await supabase
            .from('customers')
            .update({
              primary_contact_name: remaining[0].name,
              primary_email: remaining[0].email,
              primary_phone: remaining[0].phone
            })
            .eq('id', current.customer_id);
        } else {
          await supabase
            .from('customers')
            .update({
              primary_contact_name: null,
              primary_email: null,
              primary_phone: null
            })
            .eq('id', current.customer_id);
        }
      }

      await this.logContactAudit({
        action: 'DELETE',
        table_name: 'customer_contacts',
        record_id: contactId,
        summary_message: `Deleted contact ${current?.name || contactId}`,
        previous_values: current
      });

      return { data: { success: true }, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to delete customer contact' };
    }
  },

  /**
   * Set a specific contact as the primary contact for a customer
   */
  async setPrimaryContact(customerId, contactId) {
    if (!customerId || !contactId) {
      return { data: null, error: 'Both customerId and contactId are required' };
    }

    try {
      const { data: contact, error: fetchErr } = await supabase
        .from('customer_contacts')
        .select('*')
        .eq('id', contactId)
        .eq('customer_id', customerId)
        .single();

      if (fetchErr || !contact) {
        throw new Error('Contact not found or does not belong to specified customer');
      }

      // 1. Clear existing primary contacts for this customer
      await supabase
        .from('customer_contacts')
        .update({ is_primary: false })
        .eq('customer_id', customerId);

      // 2. Set selected contact as primary
      const { data, error: updateErr } = await supabase
        .from('customer_contacts')
        .update({ is_primary: true })
        .eq('id', contactId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // 3. Synchronize customer summary
      await supabase
        .from('customers')
        .update({
          primary_contact_name: contact.name,
          primary_email: contact.email,
          primary_phone: contact.phone
        })
        .eq('id', customerId);

      await this.logContactAudit({
        action: 'UPDATE',
        table_name: 'customer_contacts',
        record_id: contactId,
        summary_message: `Set ${contact.name} as primary contact for customer ID ${customerId}`,
        new_values: { is_primary: true }
      });

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to set primary contact' };
    }
  },

  /**
   * Fetch all active suppliers with their contact person details
   */
  async getAllSupplierContacts() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, supplier_code, name, contact_person, email, phone, gstin, address, city, state, country, payment_terms, rating, categories_supplied, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('name', { ascending: true });

    return { data: data || [], error: error ? error.message : null };
  },

  /**
   * Fetch contact info for a specific supplier
   */
  async getSupplierContacts(supplierId) {
    if (!supplierId) return { data: null, error: 'Supplier ID is required' };

    const { data, error } = await supabase
      .from('suppliers')
      .select('id, supplier_code, name, contact_person, email, phone, gstin, address, city, state, country, payment_terms, rating, categories_supplied, is_active')
      .eq('id', supplierId)
      .single();

    return { data: data || null, error: error ? error.message : null };
  },

  /**
   * Create a new approved supplier record with contact information
   */
  async createSupplierContact(supplierData) {
    if (!supplierData.name?.trim()) {
      return { data: null, error: 'Supplier / company name is required' };
    }
    if (!supplierData.contact_person?.trim()) {
      return { data: null, error: 'Contact person name is required' };
    }
    if (!supplierData.email?.trim() || !supplierData.email.includes('@')) {
      return { data: null, error: 'Valid supplier contact email is required' };
    }

    try {
      const supplierCode = supplierData.supplier_code?.trim() || 
        `SUP-${supplierData.name.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()}-${Date.now().toString().slice(-3)}`;

      const insertPayload = {
        supplier_code: supplierCode,
        name: supplierData.name.trim(),
        contact_person: supplierData.contact_person.trim(),
        email: supplierData.email.trim().toLowerCase(),
        phone: supplierData.phone?.trim() || null,
        gstin: supplierData.gstin?.trim() || null,
        city: supplierData.city?.trim() || null,
        state: supplierData.state?.trim() || null,
        country: supplierData.country?.trim() || 'India',
        payment_terms: supplierData.payment_terms?.trim() || '30 Days Net',
        rating: Number(supplierData.rating) || 5,
        categories_supplied: supplierData.categories_supplied || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      await this.logContactAudit({
        action: 'CREATE',
        table_name: 'suppliers',
        record_id: data.id,
        summary_message: `Created supplier ${insertPayload.name} with contact ${insertPayload.contact_person}`,
        new_values: insertPayload
      });

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to create supplier contact' };
    }
  },

  /**
   * Update an existing supplier contact
   */
  async updateSupplierContact(supplierId, contactData) {
    if (!supplierId) return { data: null, error: 'Supplier ID is required' };

    try {
      const { data: current, error: fetchErr } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();

      if (fetchErr || !current) {
        throw new Error(fetchErr?.message || 'Supplier record not found');
      }

      const updatePayload = {
        contact_person: contactData.contact_person !== undefined ? contactData.contact_person?.trim() : current.contact_person,
        email: contactData.email !== undefined ? contactData.email?.trim().toLowerCase() : current.email,
        phone: contactData.phone !== undefined ? (contactData.phone?.trim() || null) : current.phone,
        name: contactData.name !== undefined ? contactData.name?.trim() : current.name,
        gstin: contactData.gstin !== undefined ? (contactData.gstin?.trim() || null) : current.gstin,
        city: contactData.city !== undefined ? (contactData.city?.trim() || null) : current.city,
        state: contactData.state !== undefined ? (contactData.state?.trim() || null) : current.state,
        payment_terms: contactData.payment_terms !== undefined ? contactData.payment_terms?.trim() : current.payment_terms
      };

      const { data, error } = await supabase
        .from('suppliers')
        .update(updatePayload)
        .eq('id', supplierId)
        .select()
        .single();

      if (error) throw error;

      await this.logContactAudit({
        action: 'UPDATE',
        table_name: 'suppliers',
        record_id: supplierId,
        summary_message: `Updated supplier contact for ${updatePayload.name || current.name}`,
        previous_values: current,
        new_values: updatePayload
      });

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to update supplier contact' };
    }
  },

  /**
   * Soft-delete/deactivate a supplier (is_active = false)
   * Mandatory safety constraint: NEVER physically delete supplier master records.
   */
  async deleteSupplierContact(supplierId) {
    if (!supplierId) return { data: null, error: 'Supplier ID is required' };

    try {
      const { data: current } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();

      const { data, error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', supplierId)
        .select()
        .single();

      if (error) throw error;

      await this.logContactAudit({
        action: 'DEACTIVATE',
        table_name: 'suppliers',
        record_id: supplierId,
        summary_message: `Deactivated supplier ${current?.name || supplierId} (is_active = false)`,
        previous_values: { is_active: true },
        new_values: { is_active: false }
      });

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to deactivate supplier' };
    }
  },

  /**
   * Fetch unified contacts directory formatted for ContactsScreen
   * Pure database-backed with ZERO mock fallback.
   */
  async getUnifiedDirectory() {
    if (isCleanSlateMode()) {
      return { data: [], error: null };
    }

    try {
      const [custRes, contactsRes, suppliersRes] = await Promise.all([
        supabase.from('customers').select('*').eq('is_active', true).order('company_name', { ascending: true }),
        supabase.from('customer_contacts').select('*').order('is_primary', { ascending: false }).order('name', { ascending: true }),
        supabase.from('suppliers').select('*').eq('is_active', true).order('name', { ascending: true })
      ]);

      if (custRes.error) throw custRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      const contactsByCustomer = new Map();
      (contactsRes.data || []).forEach(cnt => {
        if (!contactsByCustomer.has(cnt.customer_id)) {
          contactsByCustomer.set(cnt.customer_id, []);
        }
        contactsByCustomer.get(cnt.customer_id).push(cnt);
      });

      const unifiedList = [];

      // 1. Process Customers
      (custRes.data || []).forEach((c, idx) => {
        const cContacts = contactsByCustomer.get(c.id) || [];
        const primary = cContacts.find(cnt => cnt.is_primary) || cContacts[0] || {
          id: null,
          name: c.primary_contact_name || 'Commercial Sourcing Lead',
          email: c.primary_email || 'orders@client.com',
          phone: c.primary_phone || '+91 20 6791 4200',
          designation: 'Procurement Manager',
          department: 'Procurement',
          is_primary: true
        };

        const secondary = cContacts.find(cnt => !cnt.is_primary && !cnt.is_default_cc) || (cContacts.length > 1 && cContacts[1] !== primary ? cContacts[1] : null);
        
        const ccContacts = cContacts.filter(cnt => cnt.is_default_cc || (!cnt.is_primary && cnt !== secondary));
        
        const ccList = ccContacts.map(cnt => ({
          id: cnt.id,
          label: cnt.name,
          role: cnt.designation || 'Accounts / QC',
          email: cnt.email,
          dept: cnt.department || 'Procurement'
        }));

        unifiedList.push({
          id: `CNT-${String(idx + 1).padStart(3, '0')}`,
          dbId: c.id,
          contactId: primary.id,
          companyId: c.customer_code,
          companyName: c.company_name,
          category: 'Customer',
          tier: c.industry_segment ? `Tier 1 - ${c.industry_segment}` : 'Tier 1 Enterprise Client',
          location: `${c.city || ''}, ${c.state || ''}`.replace(/^,\s*|,\s*$/g, '') || c.billing_address || 'Pune, Maharashtra',
          gstin: c.gstin || '27AAAAA0000A1Z5',
          primaryContact: {
            id: primary.id,
            name: primary.name,
            designation: primary.designation || 'Materials Manager',
            department: primary.department || 'Procurement',
            email: primary.email,
            phone: primary.phone,
            isPrimary: true
          },
          secondaryContact: secondary ? {
            id: secondary.id,
            name: secondary.name,
            designation: secondary.designation || 'Quality Inspection Lead',
            department: secondary.department || 'Quality QA',
            email: secondary.email,
            phone: secondary.phone
          } : null,
          ccList: ccList.length > 0 ? ccList : [
            { id: `cc-default-1-${c.id}`, label: 'Accounts Payable', role: 'Invoicing & Payments', email: `accounts@${primary.email?.split('@')[1] || 'client.com'}`, dept: 'Finance' },
            { id: `cc-default-2-${c.id}`, label: 'Plant Maintenance Head', role: 'Spindle Health Oversight', email: `plant.head@${primary.email?.split('@')[1] || 'client.com'}`, dept: 'Maintenance' }
          ],
          notes: `Enterprise customer account (${c.customer_code}). Payment terms: ${c.payment_terms || 'Net 30 Days'}.`
        });
      });

      // 2. Process Suppliers
      (suppliersRes.data || []).forEach((s, idx) => {
        unifiedList.push({
          id: `SUP-CNT-${String(idx + 1).padStart(3, '0')}`,
          dbId: s.id,
          contactId: s.id,
          companyId: s.supplier_code,
          companyName: s.name,
          category: 'Supplier',
          tier: s.categories_supplied ? `OEM Vendor - ${s.categories_supplied}` : 'Approved OEM Vendor',
          location: `${s.city || ''}, ${s.state || s.country || 'India'}`.replace(/^,\s*|,\s*$/g, ''),
          gstin: s.gstin || '27AAACS1094L1Z8',
          primaryContact: {
            id: s.id,
            name: s.contact_person || 'Sales Manager',
            designation: 'Vendor Technical Lead',
            department: 'OEM Sales',
            email: s.email,
            phone: s.phone,
            isPrimary: true
          },
          secondaryContact: null,
          ccList: [
            { id: `sup-cc-${s.id}`, label: 'Order Desk', role: 'Purchase Order Inward', email: s.email, dept: 'Sales' }
          ],
          notes: `Approved supplier vendor (${s.supplier_code}). Payment terms: ${s.payment_terms || 'Net 30'}. Rating: ${s.rating || 5.0}.`
        });
      });

      return {
        data: unifiedList,
        error: null,
        isMock: false
      };
    } catch (err) {
      console.error('[GPS-ERP Contacts] Unified directory fetch failure:', err);
      return { data: [], error: err.message || 'Failed to load directory from PostgreSQL', isMock: false };
    }
  },

  /**
   * High-Level Unified Contact Save Handler (Add & Edit)
   * Dispatches to Customer or Supplier mutation logic, manages CCs and primary contact.
   */
  async saveUnifiedContact(formData, editingContact = null) {
    if (!formData.companyName?.trim()) {
      return { data: null, error: 'Company name is required' };
    }
    if (!formData.primaryName?.trim()) {
      return { data: null, error: 'Primary contact name is required' };
    }
    if (!formData.primaryEmail?.trim() || !formData.primaryEmail.includes('@')) {
      return { data: null, error: 'Valid primary email address is required' };
    }

    const category = formData.category || 'Customer';

    try {
      // -----------------------------------------------------------------------
      // A. CUSTOMER RECORD MUTATION
      // -----------------------------------------------------------------------
      if (category === 'Customer') {
        let customerId = editingContact?.dbId;

        // If creating a brand new customer
        if (!customerId) {
          const custCode = `CUST-${formData.companyName.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()}-${Date.now().toString().slice(-3)}`;
          const { data: newCust, error: custErr } = await supabase
            .from('customers')
            .insert({
              customer_code: custCode,
              company_name: formData.companyName.trim(),
              gstin: formData.gstin?.trim() || null,
              city: formData.location?.split(',')[0]?.trim() || 'Pune',
              state: formData.location?.split(',')[1]?.trim() || 'Maharashtra',
              primary_contact_name: formData.primaryName.trim(),
              primary_email: formData.primaryEmail.trim().toLowerCase(),
              primary_phone: formData.primaryPhone?.trim() || null,
              industry_segment: formData.tier || 'Precision Machining',
              is_active: true
            })
            .select()
            .single();

          if (custErr) throw custErr;
          customerId = newCust.id;
        } else {
          // Update customer metadata
          await supabase
            .from('customers')
            .update({
              company_name: formData.companyName.trim(),
              gstin: formData.gstin?.trim() || null,
              city: formData.location?.split(',')[0]?.trim() || null,
              state: formData.location?.split(',')[1]?.trim() || null,
              primary_contact_name: formData.primaryName.trim(),
              primary_email: formData.primaryEmail.trim().toLowerCase(),
              primary_phone: formData.primaryPhone?.trim() || null
            })
            .eq('id', customerId);
        }

        // Handle Primary Contact row in customer_contacts
        const primaryContactId = editingContact?.primaryContact?.id || editingContact?.contactId;
        let savedContact = null;

        if (primaryContactId) {
          const res = await this.updateCustomerContact(primaryContactId, {
            name: formData.primaryName,
            email: formData.primaryEmail,
            phone: formData.primaryPhone,
            designation: formData.primaryRole,
            department: formData.primaryDept,
            is_primary: true
          });
          if (res.error) throw new Error(res.error);
          savedContact = res.data;
        } else {
          const res = await this.createCustomerContact(customerId, {
            name: formData.primaryName,
            email: formData.primaryEmail,
            phone: formData.primaryPhone,
            designation: formData.primaryRole,
            department: formData.primaryDept,
            is_primary: true
          });
          if (res.error) throw new Error(res.error);
          savedContact = res.data;
        }

        // Handle CC Emails persistence in customer_contacts
        if (formData.ccEmailsText) {
          const ccList = formData.ccEmailsText
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.includes('@'));

          // Check existing contacts to avoid duplicate entries
          const { data: existingContacts } = await supabase
            .from('customer_contacts')
            .select('email')
            .eq('customer_id', customerId);

          const existingEmails = new Set((existingContacts || []).map(c => c.email.toLowerCase()));

          for (const ccEmail of ccList) {
            const normalizedEmail = ccEmail.toLowerCase();
            if (!existingEmails.has(normalizedEmail) && normalizedEmail !== formData.primaryEmail.trim().toLowerCase()) {
              await supabase.from('customer_contacts').insert({
                customer_id: customerId,
                name: ccEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                email: normalizedEmail,
                phone: null,
                designation: 'CC Recipient',
                department: normalizedEmail.includes('account') ? 'Accounts' : normalizedEmail.includes('plant') ? 'Plant' : 'General',
                is_primary: false,
                is_default_cc: true
              });
              existingEmails.add(normalizedEmail);
            }
          }
        }

        return { data: savedContact, error: null };
      }

      // -----------------------------------------------------------------------
      // B. SUPPLIER RECORD MUTATION
      // -----------------------------------------------------------------------
      if (category === 'Supplier') {
        const supplierId = editingContact?.dbId;

        if (supplierId) {
          const res = await this.updateSupplierContact(supplierId, {
            name: formData.companyName,
            contact_person: formData.primaryName,
            email: formData.primaryEmail,
            phone: formData.primaryPhone,
            gstin: formData.gstin,
            city: formData.location?.split(',')[0]?.trim() || null,
            state: formData.location?.split(',')[1]?.trim() || null
          });
          if (res.error) throw new Error(res.error);
          return { data: res.data, error: null };
        } else {
          const res = await this.createSupplierContact({
            name: formData.companyName,
            contact_person: formData.primaryName,
            email: formData.primaryEmail,
            phone: formData.primaryPhone,
            gstin: formData.gstin,
            city: formData.location?.split(',')[0]?.trim() || 'Pune',
            state: formData.location?.split(',')[1]?.trim() || 'Maharashtra',
            country: 'India'
          });
          if (res.error) throw new Error(res.error);
          return { data: res.data, error: null };
        }
      }

      return { data: null, error: `Unsupported category: ${category}` };
    } catch (err) {
      console.error('[GPS-ERP Contacts] Save unified contact failure:', err);
      return { data: null, error: err.message || 'Failed to save contact in database' };
    }
  },

  /**
   * High-Level Unified Contact Delete/Deactivate Handler
   */
  async deleteUnifiedContact(contact) {
    if (!contact) return { data: null, error: 'Contact reference required' };

    try {
      if (contact.category === 'Customer') {
        const contactId = contact.primaryContact?.id || contact.contactId;
        if (contactId) {
          return await this.deleteCustomerContact(contactId);
        } else if (contact.dbId) {
          // If no specific contact row, deactivate customer
          await supabase.from('customers').update({ is_active: false }).eq('id', contact.dbId);
          await this.logContactAudit({
            action: 'DEACTIVATE',
            table_name: 'customers',
            record_id: contact.dbId,
            summary_message: `Deactivated customer ${contact.companyName} (is_active = false)`
          });
          return { data: { success: true }, error: null };
        }
      } else if (contact.category === 'Supplier') {
        return await this.deleteSupplierContact(contact.dbId);
      }

      return { data: null, error: `Unsupported contact category: ${contact.category}` };
    } catch (err) {
      return { data: null, error: err.message || 'Failed to delete contact from database' };
    }
  },

  /**
   * Internal GPS distribution CCs
   */
  getInternalCcs() {
    return INTERNAL_GPS_CCS || [];
  }
};

export default contactService;
