import { invoiceService } from './invoiceService';

const RECEIPT_STORAGE_KEY = 'gps_erp_payment_receipts';
const REMINDER_LOGS_KEY = 'gps_erp_payment_reminders';

/**
 * Standard Bank Details for GPS Electronic Remittance
 */
export const GPS_BANK_DETAILS = {
  bankName: 'ICICI BANK LIMITED',
  branch: 'Nanded City Destination Centre, Pune - 411041',
  accountName: 'GENERAL PRECISION SPINDLES',
  accountNumber: '349105000701',
  ifscCode: 'ICIC0003491',
  upiId: '9822044512@icici',
  msmeReg: 'MH26A0189736'
};

/**
 * Parse date strings like 'DD-MM-YYYY', 'YYYY-MM-DD', or ISO
 */
function parseDateString(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  const str = String(dateStr).trim();
  // Format DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }
  
  // ISO format or standard date string
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calculate overdue days and aging bucket
 */
function calculateAging(dueDateStr, balance) {
  if (balance <= 0) {
    return {
      dueStatus: 'PAID',
      statusLabel: 'Fully Settled',
      isOverdue: false,
      overdueDays: 0,
      daysRemaining: 0,
      agingBucket: 'Paid / Settled',
      badgeClass: 'badge-success'
    };
  }

  const dueDate = parseDateString(dueDateStr);
  const now = new Date();
  // Strip time for clean day diff
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!dueDate) {
    return {
      dueStatus: 'CURRENT',
      statusLabel: 'Current',
      isOverdue: false,
      overdueDays: 0,
      daysRemaining: 0,
      agingBucket: 'Current',
      badgeClass: 'badge-info'
    };
  }

  const dueClean = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffTime = dueClean.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    let agingBucket = '0-15 Days Overdue';
    let badgeClass = 'badge-warning';

    if (overdueDays > 60) {
      agingBucket = '60+ Days Overdue';
      badgeClass = 'badge-danger';
    } else if (overdueDays > 30) {
      agingBucket = '31-60 Days Overdue';
      badgeClass = 'badge-danger';
    } else if (overdueDays > 15) {
      agingBucket = '16-30 Days Overdue';
      badgeClass = 'badge-warning';
    }

    return {
      dueStatus: overdueDays > 30 ? 'OVERDUE_CRITICAL' : 'OVERDUE',
      statusLabel: `Overdue (${overdueDays}d)`,
      isOverdue: true,
      overdueDays,
      daysRemaining: 0,
      agingBucket,
      badgeClass
    };
  } else if (diffDays <= 7) {
    return {
      dueStatus: 'DUE_SOON',
      statusLabel: diffDays === 0 ? 'Due Today' : `Due in ${diffDays}d`,
      isOverdue: false,
      overdueDays: 0,
      daysRemaining: diffDays,
      agingBucket: 'Due Soon (≤ 7 Days)',
      badgeClass: 'badge-warning'
    };
  } else {
    return {
      dueStatus: 'CURRENT',
      statusLabel: `Due in ${diffDays}d`,
      isOverdue: false,
      overdueDays: 0,
      daysRemaining: diffDays,
      agingBucket: 'Current / Not Due',
      badgeClass: 'badge-info'
    };
  }
}

/**
 * Get stored payment receipts from localStorage
 */
function getStoredReceipts() {
  try {
    const data = localStorage.getItem(RECEIPT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (_e) {
    return [];
  }
}

/**
 * Save receipts to localStorage
 */
function saveStoredReceipts(receipts) {
  try {
    localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receipts));
  } catch (_e) {}
}

/**
 * Get reminder logs from localStorage
 */
function getStoredReminders() {
  try {
    const data = localStorage.getItem(REMINDER_LOGS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (_e) {
    return {};
  }
}

/**
 * Save reminder log
 */
function saveStoredReminder(id, reminderInfo) {
  try {
    const reminders = getStoredReminders();
    reminders[id] = reminderInfo;
    localStorage.setItem(REMINDER_LOGS_KEY, JSON.stringify(reminders));
  } catch (_e) {}
}

/**
 * Client Payment & Receivables Domain Service
 */
export const clientPaymentService = {
  /**
   * Load complete client payments and receivables ledger
   */
  async getPaymentLedger() {
    const invRes = await invoiceService.getInvoices();
    if (invRes.error) {
      return { data: null, error: invRes.error };
    }

    const invoices = invRes.data || [];
    let receipts = getStoredReceipts();
    const reminders = getStoredReminders();

    // If no receipts are stored yet, generate initial baseline receipts for invoices with paid amounts
    if (receipts.length === 0) {
      const initialReceipts = [];
      let receiptCounter = 101;
      invoices.forEach(inv => {
        const paid = Number(inv.paidAmountNum || inv.receivedAmount || 0);
        if (paid > 0) {
          initialReceipts.push({
            id: `RCP-2026-${receiptCounter++}`,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber || inv.id,
            customerId: inv.customerId,
            customerName: inv.customer || inv.customerFullName || 'Valued Client',
            customerEmail: inv.customerEmail || 'accounts@client.com',
            amount: paid,
            paymentDate: inv.invoiceDate || '2026-10-01',
            paymentMode: 'NEFT/RTGS',
            referenceNumber: `UTR-ICIC${Math.floor(10000000 + Math.random() * 90000000)}`,
            bankName: 'ICICI Bank Ltd',
            notes: 'Advance / milestone payment cleared via electronic remittance',
            recordedBy: 'Accounts & Commercial Desk',
            createdAt: new Date().toISOString()
          });
        }
      });
      if (initialReceipts.length > 0) {
        receipts = initialReceipts;
        saveStoredReceipts(receipts);
      }
    }

    // Augment every invoice with computed payment status, aging, and history
    const ledger = invoices.map(inv => {
      const totalNum = Number(inv.totalAmount || inv.amountNum || 0);
      const paidNum = Number(inv.paidAmountNum || inv.receivedAmount || 0);
      const balanceNum = Math.max(0, totalNum - paidNum);
      const aging = calculateAging(inv.dueDate, balanceNum);

      const invoiceReceipts = receipts.filter(r => 
        r.invoiceId === inv.id || r.invoiceNumber === (inv.invoiceNumber || inv.id)
      );

      const reminderInfo = reminders[inv.id] || reminders[inv.invoiceNumber] || null;

      return {
        ...inv,
        totalNum,
        paidNum,
        balanceNum,
        ...aging,
        paymentReceipts: invoiceReceipts,
        lastReminderSent: reminderInfo?.sentAt || null,
        reminderRecipient: reminderInfo?.recipient || null,
        reminderCount: reminderInfo?.count || 0
      };
    });

    // Group ledger records by client
    const clientMap = new Map();

    ledger.forEach(inv => {
      const clientKey = (inv.customer || inv.customerFullName || 'Unknown Client').trim();
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, {
          clientName: clientKey,
          customerId: inv.customerId,
          contactEmail: inv.customerEmail || 'accounts@client.com',
          contactPhone: inv.contactNo || inv.customerContact || 'N/A',
          gstin: inv.customerGstin || inv.gstin || 'N/A',
          billingAddress: inv.customerAddress || inv.billingAddress || 'N/A',
          totalInvoiced: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
          invoicesCount: 0,
          pendingInvoicesCount: 0,
          overdueInvoicesCount: 0,
          invoices: [],
          receipts: [],
          lastReminderSent: null
        });
      }

      const client = clientMap.get(clientKey);
      client.totalInvoiced += inv.totalNum;
      client.totalPaid += inv.paidNum;
      client.totalOutstanding += inv.balanceNum;
      if (inv.isOverdue) {
        client.totalOverdue += inv.balanceNum;
        client.overdueInvoicesCount += 1;
      }
      client.invoicesCount += 1;
      if (inv.balanceNum > 0) {
        client.pendingInvoicesCount += 1;
      }
      client.invoices.push(inv);

      if (inv.lastReminderSent) {
        if (!client.lastReminderSent || new Date(inv.lastReminderSent) > new Date(client.lastReminderSent)) {
          client.lastReminderSent = inv.lastReminderSent;
        }
      }
    });

    // Add matching receipts to clients
    receipts.forEach(r => {
      const clientKey = (r.customerName || '').trim();
      if (clientMap.has(clientKey)) {
        clientMap.get(clientKey).receipts.push(r);
      }
    });

    const clientSummaries = Array.from(clientMap.values()).map(c => {
      let clientStatus = 'Fully Settled';
      let clientBadgeClass = 'badge-success';

      if (c.overdueInvoicesCount > 0) {
        clientStatus = `${c.overdueInvoicesCount} Overdue`;
        clientBadgeClass = 'badge-danger';
      } else if (c.pendingInvoicesCount > 0) {
        clientStatus = `${c.pendingInvoicesCount} Pending`;
        clientBadgeClass = 'badge-warning';
      }

      return {
        ...c,
        clientStatus,
        clientBadgeClass,
        collectionRatio: c.totalInvoiced > 0 ? Math.round((c.totalPaid / c.totalInvoiced) * 100) : 100
      };
    });

    // Sort client summaries by highest outstanding balance descending
    clientSummaries.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    // Compute Overall Executive KPIs
    const totalBilled = ledger.reduce((sum, inv) => sum + inv.totalNum, 0);
    const totalCollected = ledger.reduce((sum, inv) => sum + inv.paidNum, 0);
    const totalReceivables = ledger.reduce((sum, inv) => sum + inv.balanceNum, 0);
    const overdueAmount = ledger.filter(inv => inv.isOverdue).reduce((sum, inv) => sum + inv.balanceNum, 0);
    const overdueInvoicesCount = ledger.filter(inv => inv.isOverdue).length;
    const pendingInvoicesCount = ledger.filter(inv => inv.balanceNum > 0).length;
    const fullyPaidInvoicesCount = ledger.filter(inv => inv.balanceNum === 0).length;
    const clientsWithPendingCount = clientSummaries.filter(c => c.totalOutstanding > 0).length;

    const kpis = {
      totalBilled,
      totalCollected,
      totalReceivables,
      overdueAmount,
      overdueInvoicesCount,
      pendingInvoicesCount,
      fullyPaidInvoicesCount,
      clientsWithPendingCount,
      totalClientsCount: clientSummaries.length,
      collectionEfficiency: totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '100.0'
    };

    return {
      data: {
        invoices: ledger,
        clientSummaries,
        receipts: [...receipts].sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt)),
        kpis
      },
      error: null
    };
  },

  /**
   * Record a new payment receipt against an invoice
   */
  async recordPayment({
    invoiceId,
    invoiceNumber,
    customerName,
    customerEmail,
    amount,
    paymentDate,
    paymentMode = 'NEFT/RTGS',
    referenceNumber = '',
    bankName = 'ICICI Bank Ltd',
    notes = '',
    recordedBy = 'Commercial Desk Lead'
  }) {
    if (!invoiceId) {
      return { error: { message: 'Invoice identification is required' } };
    }
    const paymentNum = Number(amount);
    if (isNaN(paymentNum) || paymentNum <= 0) {
      return { error: { message: 'Please enter a valid positive payment amount' } };
    }

    // 1. Update official Invoice database record via invoiceService
    const updateRes = await invoiceService.recordInvoicePayment(invoiceId, paymentNum);
    if (updateRes.error) {
      return { error: updateRes.error };
    }

    // 2. Log receipt into transaction history
    const existingReceipts = getStoredReceipts();
    const newReceipt = {
      id: `RCP-2026-${String(existingReceipts.length + 101).padStart(4, '0')}`,
      invoiceId,
      invoiceNumber: invoiceNumber || invoiceId,
      customerName: customerName || 'Valued Client',
      customerEmail: customerEmail || '',
      amount: paymentNum,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentMode,
      referenceNumber: referenceNumber.trim() || `REF-${Date.now().toString().slice(-6)}`,
      bankName: bankName || 'ICICI Bank Ltd',
      notes: notes.trim() || `Payment received against invoice ${invoiceNumber || invoiceId}`,
      recordedBy,
      createdAt: new Date().toISOString()
    };

    existingReceipts.unshift(newReceipt);
    saveStoredReceipts(existingReceipts);

    return { data: newReceipt, error: null };
  },

  /**
   * Record that a reminder email was dispatched
   */
  logReminderSent({ invoiceId, recipient, totalBalance }) {
    if (!invoiceId) return;
    const reminders = getStoredReminders();
    const current = reminders[invoiceId] || { count: 0 };
    
    saveStoredReminder(invoiceId, {
      sentAt: new Date().toISOString(),
      recipient: recipient || 'Client Accounts Desk',
      balanceAtReminder: totalBalance,
      count: (current.count || 0) + 1
    });
  },

  /**
   * Generate prepared email data structure for OutlookEmailComposer
   */
  generateReminderEmailData(invoice) {
    const docId = invoice.invoiceNumber || invoice.id || 'INV-2026-001';
    const customer = invoice.customer || invoice.customerFullName || 'Valued Client';
    const email = invoice.customerEmail || 'accounts@client.com';
    const total = invoice.formattedTotal || `₹${Number(invoice.totalNum || invoice.totalAmount || 0).toLocaleString('en-IN')}`;
    const paid = invoice.paidAmount || `₹${Number(invoice.paidNum || invoice.paidAmountNum || 0).toLocaleString('en-IN')}`;
    const balance = invoice.balance || `₹${Number(invoice.balanceNum || invoice.balanceAmount || 0).toLocaleString('en-IN')}`;
    const dueDate = invoice.dueDate || 'Immediate';
    const dateStr = invoice.invoiceDate || invoice.date || 'Recent';
    const overdueDays = invoice.overdueDays || 0;
    const refOrder = invoice.poNumber || invoice.refOrder || 'VERBAL';

    const subject = overdueDays > 0
      ? `Payment Follow-up: Overdue Balance ${balance} for Invoice ${docId} — GPS Spindle`
      : `Payment Schedule Reminder: Invoice ${docId} [Balance ${balance}] — GPS Spindle`;

    const body = `Dear Accounts & Commercial Team (${customer}),

We hope this email finds you well.

This is a gentle commercial payment follow-up regarding the outstanding balance for Tax Invoice ${docId}, issued on ${dateStr}${refOrder !== 'VERBAL' ? ` against Purchase Order ${refOrder}` : ''}.

INVOICE & PAYMENT SUMMARY:
--------------------------------------------------
• Invoice Number        : ${docId}
• Reference PO / Order  : ${refOrder}
• Original Billed Total : ${total}
• Amount Received So Far: ${paid}
• Outstanding Balance   : ${balance}
• Agreed Due Date       : ${dueDate}${overdueDays > 0 ? ` (Overdue by ${overdueDays} days)` : ''}
--------------------------------------------------

ELECTRONIC REMITTANCE DETAILS (RTGS / NEFT / IMPS):
• Beneficiary Name : ${GPS_BANK_DETAILS.accountName}
• Bank Name        : ${GPS_BANK_DETAILS.bankName}
• Branch           : ${GPS_BANK_DETAILS.branch}
• Account Number   : ${GPS_BANK_DETAILS.accountNumber}
• IFSC Code        : ${GPS_BANK_DETAILS.ifscCode}
• MSME UDYAM Reg   : ${GPS_BANK_DETAILS.msmeReg}

We kindly request your finance department to schedule the clearance of the balance amount at the earliest, or share the bank UTR / payment reference number if the transfer is already in progress.

If you have any questions or require duplicate copies of the invoice or signed delivery challan, please feel free to reach out.

Warm regards,

Commercial & Accounts Desk
General Precision Spindles Pvt. Ltd.
Plot B-12, Nanded City Industrial Complex, Pune - 411041
Phone: +91 20 6711 9400 | Mobile: +91 98220 44512
Email: sales@gpsspindle.com | Web: www.gpsspindle.com`;

    return {
      id: docId,
      docId,
      customer,
      customerEmail: email,
      recipientEmail: email,
      to: email,
      subject,
      body,
      total,
      paid,
      balance,
      dueDate,
      date: dateStr,
      templateType: 'payment_reminder',
      attachmentName: `${docId}_Payment_Statement.pdf`,
      attachmentType: 'Tax Invoice & Receivables Statement',
      attachmentSize: '248 KB',
      invoiceData: invoice
    };
  },

  /**
   * Generate Consolidated Reminder for a client with multiple pending invoices
   */
  generateConsolidatedReminderEmailData(clientSummary) {
    const client = clientSummary.clientName;
    const email = clientSummary.contactEmail || 'accounts@client.com';
    const pendingInvoices = (clientSummary.invoices || []).filter(inv => inv.balanceNum > 0);
    const totalPending = `₹${clientSummary.totalOutstanding.toLocaleString('en-IN')}`;
    const totalInvoiced = `₹${clientSummary.totalInvoiced.toLocaleString('en-IN')}`;

    const invoiceLines = pendingInvoices.map(inv => 
      `• Inv No: ${inv.invoiceNumber || inv.id} | Date: ${inv.invoiceDate || inv.date} | Total: ₹${inv.totalNum.toLocaleString('en-IN')} | Pending: ₹${inv.balanceNum.toLocaleString('en-IN')} | Due: ${inv.dueDate} ${inv.isOverdue ? `(OVERDUE by ${inv.overdueDays}d)` : ''}`
    ).join('\n');

    const subject = `Outstanding Statement of Accounts — Outstanding Balance ${totalPending} — GPS Spindle`;

    const body = `Dear Accounts & Finance Team (${client}),

We are writing from the Commercial Accounts Desk at General Precision Spindles Pvt. Ltd. to share the current Statement of Outstanding Invoices for your review.

STATEMENT OF PENDING RECEIVABLES:
----------------------------------------------------------------------------------------
${invoiceLines}
----------------------------------------------------------------------------------------
Total Outstanding Payable: ${totalPending} (Across ${pendingInvoices.length} invoices)

ELECTRONIC REMITTANCE DETAILS (RTGS / NEFT / IMPS):
• Beneficiary Name : ${GPS_BANK_DETAILS.accountName}
• Bank Name        : ${GPS_BANK_DETAILS.bankName}
• Branch           : ${GPS_BANK_DETAILS.branch}
• Account Number   : ${GPS_BANK_DETAILS.accountNumber}
• IFSC Code        : ${GPS_BANK_DETAILS.ifscCode}

Kindly review this statement with your payment run schedule and advise when payment clearance can be expected. If any payment has already been credited, please reply with the respective UTR number so our accounts team can allocate it.

Thank you for your valued business and cooperation.

Warm regards,

Commercial & Accounts Desk
General Precision Spindles Pvt. Ltd.
Pune, Maharashtra | sales@gpsspindle.com | +91 98220 44512`;

    return {
      id: `STMT-${client.replace(/\s+/g, '-').slice(0, 10)}-2026`,
      docId: `STMT-${client.replace(/\s+/g, '-').slice(0, 10)}-2026`,
      customer: client,
      customerEmail: email,
      recipientEmail: email,
      to: email,
      subject,
      body,
      total: totalInvoiced,
      balance: totalPending,
      templateType: 'payment_reminder',
      attachmentName: `Statement_of_Accounts_${client.replace(/\s+/g, '_')}.pdf`,
      attachmentType: 'Client Statement of Accounts',
      attachmentSize: '312 KB',
      clientSummary
    };
  }
};

export default clientPaymentService;
