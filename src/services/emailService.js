// Email Service - Mock Abstraction for GPS Spindle ERP Outlook-Style Email Integration
// Designed so a real email provider (SMTP, Microsoft Graph, SendGrid, etc.) can replace this later.

export const DEFAULT_SENDER = 'sales@gpsspindle.com';

// Customer email mapping helper
export const CUSTOMER_EMAILS = {
  'Tata Advanced Systems Ltd': {
    primary: 'tanmay@tataadvanced.com',
    cc: ['purchase@tataadvanced.com', 'accounts@tataadvanced.com'],
    contact: 'Mr. Tanmay Sharma (DGM - Procurement)'
  },
  'LINAMAR INDIA PRIVATE LIMITED': {
    primary: 'purchase@linamar.com',
    cc: ['plant.head@linamar.com', 'accounts@linamar.com'],
    contact: 'Mr. Rajesh Verma (Materials & Plant Maintenance)'
  },
  'Bharat Forge Ltd': {
    primary: 'procurement@bharatforge.com',
    cc: ['sunil.kadam@bharatforge.com', 'finance@bharatforge.com'],
    contact: 'Mr. Sunil Kadam (DGM - Maintenance & Tooling)'
  },
  'Bharat Forge Ltd - Chakan': {
    primary: 'procurement@bharatforge.com',
    cc: ['sunil.kadam@bharatforge.com'],
    contact: 'Mr. Sunil Kadam (DGM - Maintenance & Tooling)'
  },
  'Godrej & Boyce Aerospace': {
    primary: 'maintenance@godrejaerospace.com',
    cc: ['anita.s@godrej.com', 'finance@godrej.com'],
    contact: 'Ms. Anita Saxena (Lead - Aerospace Tooling)'
  },
  'Mahindra Heavy Engines': {
    primary: 'projects@mahindra.com',
    cc: ['p.shinde@mahindra.com', 'accounts@mahindra.com'],
    contact: 'Mr. Praveen Shinde (Plant Maintenance)'
  },
  'Mahindra Heavy Engines Ltd': {
    primary: 'projects@mahindra.com',
    cc: ['p.shinde@mahindra.com', 'accounts@mahindra.com'],
    contact: 'Mr. Praveen Shinde (Plant Maintenance)'
  }
};

export const SUPPLIER_EMAILS = {
  'Schaeffler India': {
    primary: 'r.nair@schaeffler.com',
    cc: ['orders@schaeffler.com', 'accounts@schaeffler.com'],
    contact: 'Mr. Rajesh Nair (Sales Director - Spindle Bearings)'
  },
  'Bharat Special Steel': {
    primary: 'sales@bharatspecialsteel.com',
    cc: ['manoj.g@bharatspecialsteel.com'],
    contact: 'Mr. Manoj Gokhale (Head - Metallurgy)'
  },
  'OTT Jakob': {
    primary: 'raman@ottjakob-india.com',
    cc: ['support@ottjakob-india.com'],
    contact: 'Mr. K. S. Raman (Country Applications Manager)'
  },
  'Heidenhain India': {
    primary: 'info@heidenhain.in',
    cc: ['service@heidenhain.in'],
    contact: 'Mr. Suresh Babu (Regional Head)'
  },
  'Sandvik Coromant India': {
    primary: 'orders@sandvik.com',
    cc: ['priya.s@sandvik.com'],
    contact: 'Ms. Priya Sharma (Key Accounts)'
  }
};

export function getSupplierEmailInfo(supplierName) {
  if (!supplierName) {
    return {
      primary: 'procurement@vendor-partner.com',
      cc: ['sales@vendor-partner.com'],
      contact: 'Sir / Madam'
    };
  }
  if (SUPPLIER_EMAILS[supplierName]) {
    return SUPPLIER_EMAILS[supplierName];
  }
  const key = Object.keys(SUPPLIER_EMAILS).find(k => 
    supplierName.toLowerCase().includes(k.toLowerCase()) || 
    k.toLowerCase().includes(supplierName.toLowerCase())
  );
  if (key) return SUPPLIER_EMAILS[key];
  const cleanName = supplierName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return {
    primary: `sales@${cleanName.slice(0, 12)}.com`,
    cc: [`orders@${cleanName.slice(0, 12)}.com`],
    contact: 'Sales Desk'
  };
}

export function getCustomerEmailInfo(customerName) {
  if (!customerName) {
    return {
      primary: 'procurement@customer-plant.com',
      cc: ['accounts@customer-plant.com'],
      contact: 'Sir / Madam'
    };
  }

  // Exact match
  if (CUSTOMER_EMAILS[customerName]) {
    return CUSTOMER_EMAILS[customerName];
  }

  // Partial match
  const key = Object.keys(CUSTOMER_EMAILS).find(k => 
    customerName.toLowerCase().includes(k.toLowerCase()) || 
    k.toLowerCase().includes(customerName.toLowerCase())
  );

  if (key) {
    return CUSTOMER_EMAILS[key];
  }

  // Fallback domain from customer name
  const cleanName = customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return {
    primary: `purchase@${cleanName.slice(0, 12)}.com`,
    cc: [`accounts@${cleanName.slice(0, 12)}.com`],
    contact: 'Procurement Officer'
  };
}

export const EMAIL_TEMPLATES = [
  { id: 'quotation', label: 'Quotation & Technical Proposal' },
  { id: 'invoice', label: 'Commercial Tax Invoice' },
  { id: 'purchase_order', label: 'Purchase Order (PO)' },
  { id: 'proforma_invoice', label: 'Proforma Invoice (PI)' },
  { id: 'eway_bill', label: 'E-Way Bill (EWB)' },
  { id: 'payment_reminder', label: 'Payment Follow-up / Overdue Reminder' },
  { id: 'order_confirmation', label: 'Sales Order Confirmation' },
  { id: 'dispatch_notification', label: 'Spindle Dispatch Notification' },
  { id: 'custom', label: 'Custom / Blank Email' }
];

export function generateEmailContent({ type = 'quotation', doc = {}, templateId = null }) {
  const chosenType = templateId || type;
  const customerName = doc.customer || 'Customer Organization';
  const customerInfo = getCustomerEmailInfo(customerName);
  const docId = doc.id || doc.estimateNo || 'DOC-2026-0001';
  const isInvoice = chosenType === 'invoice' || chosenType === 'payment_reminder' || doc.id?.startsWith('INV');

  // Format currency helper
  const formatCur = (val) => {
    if (typeof val === 'number') return `₹${val.toLocaleString('en-IN')}`;
    if (typeof val === 'string' && val.startsWith('₹')) return val;
    return val ? `₹${val}` : '₹0';
  };

  const spindleModel = doc.spindleModel || doc.items?.[0]?.name || doc.items?.[0]?.desc || 'GPS Precision Spindle Unit';
  const quantity = doc.items ? doc.items.reduce((s, it) => s + (Number(it.qty) || 1), 0) : 1;
  const subtotal = formatCur(doc.subtotal || doc.amount || 575000);
  const gst = formatCur(doc.gstAmount || doc.gst || Math.round((doc.subtotal || 575000) * 0.18));
  const total = formatCur(doc.totalAmount || doc.amount || 678500);
  const balance = formatCur(doc.balance || total);
  const dateStr = doc.date || '09 Sep 2026';
  const refOrder = doc.refOrder || doc.challanNo || 'SO-2026-0142';

  let subject = '';
  let body = '';
  let attachmentName = '';
  let attachmentType = '';
  let attachmentSize = '218 KB';
  let recipientEmail = customerInfo.primary;
  let recipientCc = customerInfo.cc || [];

  if (chosenType === 'purchase_order' || chosenType === 'po' || docId.startsWith('PO')) {
    const supplierName = doc.supplier || 'Vendor Partner';
    const supplierInfo = getSupplierEmailInfo(supplierName);
    recipientEmail = doc.supplierEmail || supplierInfo.primary;
    recipientCc = supplierInfo.cc || [];
    subject = `Purchase Order ${docId} — GPS Spindle`;
    attachmentName = `${docId}.pdf`;
    attachmentType = 'Purchase Order';
    attachmentSize = '198 KB';
    body = `Dear ${supplierInfo.contact},

Please find attached official Purchase Order ${docId} from General Precision Spindles Pvt. Ltd.

Order Summary:
• PO Number: ${docId}
• Supplier: ${supplierName}
• Order Date: ${dateStr}
• Expected Delivery: ${doc.expectedDelivery || '15 Sep 2026'}
• Total Value: ${total}
• Delivery Location: ${doc.deliveryAddress || 'Plot B-12, Nanded City Industrial Complex, Pune - 411041'}
• Payment Terms: ${doc.paymentTerms || 'Net 30 Days from GRN'}

Please acknowledge receipt and confirm shipment date along with standard EN 10204 3.1 Material / Calibration Certificates.

Regards,
Procurement & Stores Division
General Precision Spindles Pvt. Ltd.
Plot B-12, Nanded City Industrial Complex, Pune - 411041
Phone: +91 20 6711 9400 | purchase@gpsspindle.com`;

  } else if (chosenType === 'proforma_invoice' || chosenType === 'proforma' || docId.startsWith('PI')) {
    subject = `Proforma Invoice ${docId} — GPS Spindle`;
    attachmentName = `${docId}.pdf`;
    attachmentType = 'Proforma Invoice';
    attachmentSize = '226 KB';
    recipientEmail = doc.customerEmail || customerInfo.primary;
    body = `Dear ${customerInfo.contact},

Please find attached official Proforma Invoice ${docId} generated against confirmed Sales Order ${doc.salesOrder || 'SO-2026-041'}.

Proforma Invoice Details:
• Proforma No: ${docId}
• Sales Order Reference: ${doc.salesOrder || 'SO-2026-041'}
• Issue Date: ${dateStr}
• Validity: ${doc.validUntil || '30 Days'}
• Taxable Subtotal: ${subtotal}
• GST (18%): ${gst}
• Total Payable Amount: ${total}
• Payment Terms: ${doc.paymentTerms || '50% Advance with Proforma'}

Bank Wire Details for Electronic Remittance (RTGS / NEFT):
• Bank Name: ICICI BANK LIMITED, PUNE NANDED CITY
• Account Name: GENERAL PRECISION SPINDLES
• Account No: 349105000701
• IFSC Code: ICIC0003491

Please confirm remittance reference at your earliest convenience to release spindle components for cleanroom assembly.

Regards,
Rahul Patil
Sales & Commercial Applications
General Precision Spindles Pvt. Ltd.
Pune, Maharashtra | sales@gpsspindle.com`;

  } else if (chosenType === 'eway_bill' || chosenType === 'ewb' || docId.startsWith('EWB')) {
    subject = `E-Way Bill ${docId} — GPS Spindle`;
    attachmentName = `${docId}.pdf`;
    attachmentType = 'E-Way Bill';
    attachmentSize = '174 KB';
    recipientEmail = doc.customerEmail || customerInfo.primary;
    body = `Dear ${customerInfo.contact},

Please find attached official E-Way Bill ${docId} generated for consignment dispatch under Tax Invoice ${doc.invoice || 'INV-2026-019'}.

E-Way Bill Transit Summary:
• E-Way Bill No: ${docId}
• Invoice No: ${doc.invoice || 'INV-2026-019'}
• Consignee / Recipient: ${customerName}
• Transporter: ${doc.transporter || 'ABC Logistics'}
• Vehicle Number: ${doc.vehicle || 'MH12AB1234'}
• Transport Mode: ${doc.mode || 'Road'} (Distance: ${doc.distance || '540 km'})
• Validity: Valid until ${doc.validUntil || '10 Sep 2026'}
• Consignment Total Value: ${total}

The physical transport docket and driver trip sheet accompany the delivery vehicle.

Regards,
Logistics & Dispatch Division
General Precision Spindles Pvt. Ltd.
Pune, Maharashtra | dispatch@gpsspindle.com`;

  } else if (chosenType === 'invoice') {
    subject = `Invoice ${docId} — GPS Spindle Pvt. Ltd.`;
    attachmentName = `${docId}.pdf`;
    attachmentType = 'Tax Invoice';
    attachmentSize = '248 KB';
    body = `Dear ${customerInfo.contact},

Please find attached the official Tax Invoice ${docId} for the precision spindle equipment and services provided by General Precision Spindles Pvt. Ltd.

Invoice Details:
• Invoice No: ${docId}
• Invoice Date: ${dateStr}
• Customer: ${customerName}
• Reference Order: ${refOrder}
• Subtotal: ${subtotal}
• GST (18%): ${gst}
• Total Amount Payable: ${total}
• Outstanding Balance: ${balance}

Bank Details for Electronic Remittance (RTGS / NEFT):
• Bank: ICICI BANK LIMITED, PUNE NANDED CITY
• Account Name: GENERAL PRECISION SPINDLES
• Account No: 349105000701
• IFSC Code: ICIC0003491

Please confirm receipt and arrange payment in accordance with the agreed commercial terms.

Regards,
Rahul Patil
Sales & Commercial Applications
General Precision Spindles Pvt. Ltd.
Plot B-12, Nanded City Industrial Complex, Pune - 411041
Phone: +91 20 6711 9400 | Mobile: +91 98220 44512
Email: ${DEFAULT_SENDER} | Web: www.gpsspindle.com`;

  } else if (chosenType === 'payment_reminder') {
    subject = `Payment Reminder: Overdue Balance for Invoice ${docId} — GPS Spindle`;
    attachmentName = `${docId}.pdf`;
    attachmentType = 'Tax Invoice & Statement';
    attachmentSize = '248 KB';
    body = `Dear ${customerInfo.contact},

This is a gentle commercial follow-up regarding the outstanding balance for Tax Invoice ${docId}, issued on ${dateStr}.

Invoice Summary:
• Invoice No: ${docId}
• Reference Order: ${refOrder}
• Original Billed Amount: ${total}
• Outstanding Balance Due: ${balance}
• Due Date: ${doc.dueDate || 'Immediate'}

We kindly request your accounts department to schedule the payment clearance at the earliest or provide the UTR / wire reference number if the transfer has already been initiated.

If you have any queries or require duplicate copies of the signed delivery challan, please feel free to reach out.

Warm regards,
Rahul Patil
Accounts & Commercial Operations
General Precision Spindles Pvt. Ltd.
Pune, Maharashtra | sales@gpsspindle.com`;

  } else if (chosenType === 'order_confirmation') {
    subject = `Order Confirmation: Spindle Production Order for ${customerName} [Ref: ${docId}]`;
    attachmentName = `Order_Ack_${docId}.pdf`;
    attachmentType = 'Order Confirmation';
    attachmentSize = '194 KB';
    body = `Dear ${customerInfo.contact},

Thank you for your valued purchase order. We are pleased to formally confirm the receipt and booking of your spindle order into our Pune manufacturing schedule.

Order Summary:
• Reference Quotation: ${docId}
• Customer: ${customerName}
• Spindle Model: ${spindleModel}
• Quantity: ${quantity}
• Total Order Value: ${total}

Our shop floor engineering team has initiated raw material allocation and precision machining routing. You will receive regular stage milestone updates as your spindle progresses through balancing and final cleanroom metrology.

Regards,
Rahul Patil
Sales & Applications
GPS Spindle Pvt. Ltd. | sales@gpsspindle.com`;

  } else if (chosenType === 'dispatch_notification') {
    subject = `Dispatch Clearance & Inspection Certificate for Spindle Order ${docId}`;
    attachmentName = `Dispatch_Report_${docId}.pdf`;
    attachmentType = 'Shipping Dossier & QC Sheet';
    attachmentSize = '312 KB';
    body = `Dear ${customerInfo.contact},

We are pleased to notify you that your precision spindle order under ${docId} has successfully completed all dynamic run-in, thermal stabilization, and micron air gauging tests.

The unit has been packed in anti-corrosion VCI sealed crating and is cleared for dispatch.

Shipping Details:
• Document No: ${docId}
• Customer: ${customerName}
• Target Delivery: Within 48 Hours via Express Freight
• Accompanying Docs: Calibration Certificate, Warranty Card, Maintenance Manual

Please find the shipping dossier and inspection certificate attached for your plant inward clearance.

Regards,
Logistics & Dispatch Team
GPS Spindle Pvt. Ltd. | sales@gpsspindle.com`;

  } else if (chosenType === 'custom') {
    subject = `${docId} — General Precision Spindles`;
    attachmentName = `${docId}.pdf`;
    attachmentType = 'Document';
    attachmentSize = '180 KB';
    body = `Dear ${customerInfo.contact},

Please find attached the referenced commercial document ${docId} for your consideration.

Feel free to contact us for any technical or commercial assistance.

Regards,
Sales Team
General Precision Spindles Pvt. Ltd.
Pune, Maharashtra | sales@gpsspindle.com`;

  } else {
    // Default: Quotation
    subject = `Quotation ${docId} — ${spindleModel} Spindle`;
    attachmentName = `${docId}.pdf`;
    attachmentType = 'Quotation';
    attachmentSize = '182 KB';
    body = `Dear ${customerInfo.contact},

Please find attached our detailed commercial and technical quotation ${docId} for the ${spindleModel} high-precision spindle system.

Quotation Details:
• Quotation No: ${docId}
• Customer: ${customerName}
• Spindle Model: ${spindleModel}
• Quantity: ${quantity}
• Quotation Value (Excl. Tax): ${subtotal}
• GST (18%): ${gst}
• Total Amount: ${total}
• Validity: 30 Days from issue

The detailed quotation sheet with line items, scope of work, and warranty terms is attached to this email for your review.

Please feel free to contact us if you require any clarification, CAD integration drawings, or technical discussion.

Regards,
Rahul Patil
Sales & Applications
General Precision Spindles Pvt. Ltd.
Plot B-12, Nanded City Industrial Complex, Pune - 411041
Phone: +91 20 6711 9400 | Mobile: +91 98220 44512
Email: ${DEFAULT_SENDER} | Web: www.gpsspindle.com`;
  }

  return {
    from: DEFAULT_SENDER,
    to: [recipientEmail || customerInfo.primary],
    cc: recipientCc || customerInfo.cc || [],
    subject,
    body,
    attachments: [
      {
        id: 'att-main',
        name: attachmentName,
        type: attachmentType,
        size: attachmentSize,
        docRef: docId,
        isPrimaryDoc: true,
        docData: doc
      }
    ]
  };
}

// Initial realistic Email Activity History
export const INITIAL_EMAIL_ACTIVITY = [
  {
    id: 'em-101',
    date: '09 Sep 2026, 10:15 AM',
    documentId: 'INV-2026-0098',
    documentType: 'Tax Invoice',
    customer: 'Tata Advanced Systems Ltd',
    recipient: 'tanmay@tataadvanced.com',
    cc: ['accounts@tataadvanced.com', 'purchase@tataadvanced.com'],
    subject: 'Invoice INV-2026-0098 — GPS Spindle Pvt. Ltd.',
    status: 'Sent',
    sentBy: 'Rahul Patil',
    attachmentsCount: 1,
    attachmentName: 'INV-2026-0098.pdf',
    bodySnippet: 'Please find attached the official Tax Invoice INV-2026-0098 for the precision spindle...'
  },
  {
    id: 'em-102',
    date: '09 Sep 2026, 09:30 AM',
    documentId: 'QT-2026-0184',
    documentType: 'Quotation',
    customer: 'Tata Advanced Systems Ltd',
    recipient: 'purchase@tataadvanced.com',
    cc: ['accounts@tataadvanced.com'],
    subject: 'Quotation QT-2026-0184 — GPS-HSK-A63-24K Spindle',
    status: 'Sent',
    sentBy: 'Rahul Patil',
    attachmentsCount: 1,
    attachmentName: 'QT-2026-0184.pdf',
    bodySnippet: 'Please find attached our quotation QT-2026-0184 for the GPS-HSK-A63-24K high-speed spindle...'
  },
  {
    id: 'em-103',
    date: '08 Sep 2026, 04:45 PM',
    documentId: 'QTN/2026-27/294',
    documentType: 'Quotation',
    customer: 'LINAMAR INDIA PRIVATE LIMITED',
    recipient: 'purchase@linamar.com',
    cc: ['plant.head@linamar.com', 'accounts@linamar.com'],
    subject: 'Estimate QTN/2026-27/294 — LINAMAR INDIA PRIVATE LIMITED',
    status: 'Sent',
    sentBy: 'Rahul Patil',
    attachmentsCount: 2,
    attachmentName: 'QTN-2026-27-294.pdf',
    bodySnippet: 'Please find attached our detailed repair and replacement estimate for Kessler HSK-63 spindle...'
  },
  {
    id: 'em-104',
    date: '07 Sep 2026, 02:10 PM',
    documentId: 'INV-2026-052',
    documentType: 'Tax Invoice',
    customer: 'Bharat Forge Ltd',
    recipient: 'procurement@bharatforge.com',
    cc: ['sunil.kadam@bharatforge.com', 'finance@bharatforge.com'],
    subject: 'Tax Invoice INV-2026-052 — Bharat Forge Ltd',
    status: 'Sent',
    sentBy: 'Pooja Deshmukh',
    attachmentsCount: 1,
    attachmentName: 'INV-2026-052.pdf',
    bodySnippet: 'Please find attached Tax Invoice INV-2026-052 for heavy milling spindle rebuild...'
  },
  {
    id: 'em-105',
    date: '06 Sep 2026, 11:20 AM',
    documentId: 'Q-2026-090',
    documentType: 'Quotation',
    customer: 'Bharat Forge Ltd - Chakan',
    recipient: 'sunil.kadam@bharatforge.com',
    cc: ['procurement@bharatforge.com'],
    subject: 'Commercial Proposal Q-2026-090 — GPS-BT40-15K Direct Drive',
    status: 'Draft',
    sentBy: 'Rahul Patil',
    attachmentsCount: 1,
    attachmentName: 'Q-2026-090.pdf',
    bodySnippet: 'Draft quotation for 2x GPS-BT40-15K spindles with 30-day payment term review...'
  },
  {
    id: 'em-106',
    date: '05 Sep 2026, 05:00 PM',
    documentId: 'INV-2026-048',
    documentType: 'Tax Invoice',
    customer: 'Mahindra Heavy Engines Ltd',
    recipient: 'accounts@mahindra.com',
    cc: ['projects@mahindra.com'],
    subject: 'Payment Reminder: Overdue Balance for Invoice INV-2026-048',
    status: 'Failed',
    sentBy: 'Rahul Patil',
    attachmentsCount: 1,
    attachmentName: 'INV-2026-048.pdf',
    bodySnippet: 'Mail delivery error (550 Mailbox temporarily unavailable). Requires resend.'
  }
];

/**
 * Future-Ready Email Sending Abstraction
 * Simulates network request latency (1200ms), validates recipients, and returns a promise.
 * Easily swappable with fetch('/api/email/send') or Microsoft Graph API when backend is ready.
 */
export async function sendEmail({
  from = DEFAULT_SENDER,
  to = [],
  cc = [],
  subject = '',
  body = '',
  attachments = [],
  documentId = '',
  documentType = 'Quotation',
  customer = '',
  sentBy = 'Rahul Patil'
}) {
  return new Promise((resolve, reject) => {
    // Validation
    if (!to || to.length === 0) {
      reject(new Error('At least one primary recipient (To) email address is required.'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = to.filter(e => !emailRegex.test(e.trim()));
    if (invalidEmails.length > 0) {
      reject(new Error(`Invalid email address format: ${invalidEmails.join(', ')}`));
      return;
    }

    // Simulate 1.2s realistic network delivery
    setTimeout(() => {
      const newActivityRecord = {
        id: `em-${Date.now()}`,
        date: new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        documentId: documentId || 'DOC-2026',
        documentType,
        customer: customer || 'Customer Organization',
        recipient: to[0],
        allRecipients: to,
        cc: cc || [],
        subject: subject || 'No Subject',
        status: 'Sent',
        sentBy,
        attachmentsCount: attachments.length,
        attachmentName: attachments[0]?.name || 'Document.pdf',
        bodySnippet: body.slice(0, 100) + '...',
        fullBody: body,
        attachments
      };

      resolve({
        success: true,
        messageId: `<gps-${Date.now()}@mail.gpsspindle.com>`,
        record: newActivityRecord
      });
    }, 1200);
  });
}
