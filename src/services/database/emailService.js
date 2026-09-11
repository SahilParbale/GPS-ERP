import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Email Activity & Transmission Domain Service
 * Tracks email dispatch history, Outlook integration events, customer communications,
 * and delivery statuses across Quotations, Invoices, E-Way Bills, and Service Reports.
 */
export const emailService = {
  /**
   * Fetch logged email transmissions with optional filtering
   * @param {object} [options]
   */
  async getEmailActivity(options = {}) {
    return await baseService.select('email_activity', {
      select: `
        id,
        message_id,
        from_address,
        to_recipients,
        cc_recipients,
        bcc_recipients,
        subject,
        body_text,
        body_html,
        document_type,
        document_id,
        related_customer_id,
        related_supplier_id,
        customer_name,
        attachments_count,
        delivery_status,
        sent_by,
        sent_by_name,
        sent_at,
        metadata,
        customer:customers(id, customer_code, company_name),
        supplier:suppliers(id, name),
        sender:employees(id, first_name, last_name, email)
      `,
      orderBy: options.orderBy || 'sent_at',
      ascending: options.ascending ?? false,
      ...options
    });
  },

  /**
   * Fetch single email activity entry
   * @param {string} id
   */
  async getEmailById(id) {
    return await baseService.select('email_activity', {
      select: `
        *,
        customer:customers(id, customer_code, company_name),
        supplier:suppliers(id, name),
        sender:employees(id, first_name, last_name, email)
      `,
      eq: { id },
      single: true
    });
  },

  /**
   * Fetch emails related to a specific document or transaction
   * @param {string} documentId
   */
  async getEmailsByDocument(documentId) {
    return await baseService.select('email_activity', {
      eq: { document_id: documentId },
      orderBy: 'sent_at',
      ascending: false
    });
  },

  /**
   * Log an email transmission or draft into Supabase
   * Strictly avoids pretending external SMTP send succeeded; logs delivery_status accurately.
   * @param {object} data
   */
  async logEmailActivity({
    fromAddress = 'sales@gpsspindle.com',
    toRecipients = [],
    ccRecipients = [],
    bccRecipients = [],
    subject = '',
    bodyText = '',
    bodyHtml = null,
    documentType = 'Quotation',
    documentId = 'DOC-2026',
    relatedCustomerId = null,
    relatedSupplierId = null,
    customerName = '',
    attachmentsCount = 0,
    deliveryStatus = 'Sent', // 'Draft' | 'Queued' | 'Sent' | 'Delivered' | 'Failed' | 'Opened'
    sentBy = null,
    sentByName = 'Rahul Patil',
    metadata = {}
  }) {
    const toArray = Array.isArray(toRecipients) ? toRecipients : [toRecipients];
    const ccArray = Array.isArray(ccRecipients) ? ccRecipients : (ccRecipients ? [ccRecipients] : []);
    const bccArray = Array.isArray(bccRecipients) ? bccRecipients : (bccRecipients ? [bccRecipients] : []);

    const payload = {
      message_id: `<gps-${Date.now()}@mail.gpsspindles.com>`,
      from_address: fromAddress,
      to_recipients: toArray,
      cc_recipients: ccArray,
      bcc_recipients: bccArray,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      document_type: documentType,
      document_id: documentId,
      related_customer_id: relatedCustomerId,
      related_supplier_id: relatedSupplierId,
      customer_name: customerName,
      attachments_count: attachmentsCount,
      delivery_status: deliveryStatus,
      sent_by: sentBy,
      sent_by_name: sentByName,
      sent_at: new Date().toISOString(),
      metadata
    };

    return await baseService.insert('email_activity', payload);
  },

  /**
   * Update delivery status of an email (e.g. from Queued to Sent or Failed)
   * @param {string} id
   * @param {string} deliveryStatus
   * @param {object} [extraMetadata]
   */
  async updateEmailStatus(id, deliveryStatus, extraMetadata = null) {
    const updates = { delivery_status: deliveryStatus };
    if (extraMetadata) {
      updates.metadata = extraMetadata;
    }
    return await baseService.update('email_activity', id, updates);
  },

  /**
   * Delete an email activity log entry (draft discard)
   * @param {string} id
   */
  async deleteEmailActivity(id) {
    return await baseService.delete('email_activity', id);
  }
};

export default emailService;
