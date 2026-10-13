import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import { TablePageSkeleton } from '../components/common/Skeleton';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import { clientPaymentService, GPS_BANK_DETAILS } from '../services/database/clientPaymentService';
import { 
  DollarSign, Clock, AlertTriangle, CheckCircle2, 
  Send, RefreshCw, Plus, Search, Filter, 
  Building2, Calendar, FileText, ArrowUpRight, 
  CreditCard, Download, Mail, ExternalLink, 
  ChevronRight, AlertCircle, Check, Eye, Info
} from 'lucide-react';

// Date parsing helper
const parseInvDate = (dateStr) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
  }
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// Date to YYYY-MM-DD input format
const formatForDateInput = (dateVal) => {
  if (!dateVal) return '';
  const d = parseInvDate(dateVal);
  if (!d || isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function PaymentsScreen({ onNavigate, onNotify }) {
  // Main Data States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [clientSummaries, setClientSummaries] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [kpis, setKpis] = useState({
    totalBilled: 0,
    totalCollected: 0,
    totalReceivables: 0,
    overdueAmount: 0,
    overdueInvoicesCount: 0,
    pendingInvoicesCount: 0,
    fullyPaidInvoicesCount: 0,
    clientsWithPendingCount: 0,
    totalClientsCount: 0,
    collectionEfficiency: '100.0'
  });

  // UI Navigation & View State
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'clients' | 'receipts'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'DUE_SOON' | 'PARTIAL' | 'PAID'
  const [periodFilter, setPeriodFilter] = useState('ALL'); // 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'FY_2026_27' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [agingFilter, setAgingFilter] = useState('ALL'); // 'ALL' | 'CURRENT' | '1-15' | '16-30' | '31-60' | '60+'
  const [selectedClientFilter, setSelectedClientFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('overdue'); // 'overdue' | 'balance_desc' | 'date_desc'

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Email Composer States
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [emailDocData, setEmailDocData] = useState(null);

  // Record Payment Form Fields
  const [formInvoiceId, setFormInvoiceId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentDate, setFormPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [isUpdatingDueDateInPayment, setIsUpdatingDueDateInPayment] = useState(false);
  const [formPaymentMode, setFormPaymentMode] = useState('NEFT/RTGS');
  const [formReferenceNumber, setFormReferenceNumber] = useState('');
  const [formBankName, setFormBankName] = useState('ICICI Bank Ltd');
  const [formNotes, setFormNotes] = useState('');

  // Standalone Manage Client Due Date Modal State
  const [isDueDateModalOpen, setIsDueDateModalOpen] = useState(false);
  const [dueDateInvoice, setDueDateInvoice] = useState(null);
  const [modalNewDueDate, setModalNewDueDate] = useState('');
  const [dueDateReasonNotes, setDueDateReasonNotes] = useState('');
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);

  // Load payment ledger data
  const loadLedgerData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await clientPaymentService.getPaymentLedger();
      if (res.error) {
        setError(res.error.message || 'Failed to load client payment records');
        if (onNotify) onNotify('Error loading payment ledger', 'error');
      } else if (res.data) {
        setInvoices(res.data.invoices || []);
        setClientSummaries(res.data.clientSummaries || []);
        setReceipts(res.data.receipts || []);
        setKpis(res.data.kpis || {});
      }
    } catch (err) {
      console.error('Failed to load payment ledger:', err);
      setError(err.message || 'Unexpected error loading payment records');
    } finally {
      setIsLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadLedgerData();
  }, [loadLedgerData]);

  // Handle auto-opening record payment when directed from Invoices or other screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__TARGET_PAYMENT_INVOICE_ID__ && invoices.length > 0) {
      const targetId = window.__TARGET_PAYMENT_INVOICE_ID__;
      window.__TARGET_PAYMENT_INVOICE_ID__ = null;
      const found = invoices.find(i => i.id === targetId || i.dbId === targetId || i.invoiceNumber === targetId);
      if (found) {
        handleOpenRecordPayment(found);
      }
    }
  }, [invoices]);

  // Navigate to Tax Invoice on Invoices screen
  const handleViewTaxInvoice = useCallback((inv) => {
    if (!inv) return;
    const targetId = inv.dbId || inv.id || inv.invoiceNumber;
    if (typeof window !== 'undefined') {
      window.__TARGET_TAX_INVOICE_ID__ = targetId;
    }
    if (onNavigate) {
      onNavigate('invoices');
    }
  }, [onNavigate]);

  // Open Record Payment Modal for a specific invoice
  const handleOpenRecordPayment = (inv = null) => {
    if (inv) {
      setSelectedInvoice(inv);
      setFormInvoiceId(inv.id);
      setFormAmount(inv.balanceNum > 0 ? String(inv.balanceNum) : '');
      setFormNotes(`Payment received against ${inv.invoiceNumber || inv.id}`);
      setFormDueDate(formatForDateInput(inv.dueDate));
      setIsUpdatingDueDateInPayment(false);
    } else {
      // Find first pending invoice if available
      const firstPending = invoices.find(i => i.balanceNum > 0) || invoices[0];
      if (firstPending) {
        setSelectedInvoice(firstPending);
        setFormInvoiceId(firstPending.id);
        setFormAmount(firstPending.balanceNum > 0 ? String(firstPending.balanceNum) : '');
        setFormNotes(`Payment received against ${firstPending.invoiceNumber || firstPending.id}`);
        setFormDueDate(formatForDateInput(firstPending.dueDate));
        setIsUpdatingDueDateInPayment(false);
      } else {
        setSelectedInvoice(null);
        setFormInvoiceId('');
        setFormAmount('');
        setFormNotes('');
        setFormDueDate('');
        setIsUpdatingDueDateInPayment(false);
      }
    }
    setFormPaymentDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMode('NEFT/RTGS');
    setFormReferenceNumber('');
    setFormBankName('ICICI Bank Ltd');
    setIsRecordModalOpen(true);
  };

  // When changing invoice in Record Payment modal dropdown
  const handleFormInvoiceChange = (invId) => {
    setFormInvoiceId(invId);
    const target = invoices.find(i => i.id === invId);
    setSelectedInvoice(target || null);
    if (target) {
      setFormAmount(target.balanceNum > 0 ? String(target.balanceNum) : '');
      setFormNotes(`Payment received against ${target.invoiceNumber || target.id}`);
      setFormDueDate(formatForDateInput(target.dueDate));
      setIsUpdatingDueDateInPayment(false);
    }
  };

  // Submit recorded payment
  const handleConfirmPayment = async (e) => {
    if (e) e.preventDefault();
    if (!formInvoiceId || !selectedInvoice) {
      if (onNotify) onNotify('Please select an invoice to apply the payment.', 'warning');
      return;
    }
    const amt = Number(formAmount);
    if (isNaN(amt) || amt <= 0) {
      if (onNotify) onNotify('Please enter a valid positive payment amount.', 'warning');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await clientPaymentService.recordPayment({
        invoiceId: selectedInvoice.dbId || selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber || selectedInvoice.id,
        customerName: selectedInvoice.customer || selectedInvoice.customerFullName,
        customerEmail: selectedInvoice.customerEmail,
        amount: amt,
        paymentDate: formPaymentDate,
        paymentMode: formPaymentMode,
        referenceNumber: formReferenceNumber,
        bankName: formBankName,
        notes: formNotes,
        updatedDueDate: (isUpdatingDueDateInPayment && formDueDate) ? formDueDate : null
      });

      if (res.error) {
        if (onNotify) onNotify(res.error.message || 'Failed to record payment.', 'error');
      } else {
        if (onNotify) {
          onNotify(`Successfully recorded receipt of ₹${amt.toLocaleString('en-IN')} for ${selectedInvoice.invoiceNumber || selectedInvoice.id}!`);
        }
        setIsRecordModalOpen(false);
        await loadLedgerData();
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      if (onNotify) onNotify('Error recording payment transaction.', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Standalone Manage Due Date Modal
  const handleOpenManageDueDate = (inv) => {
    if (!inv) return;
    setDueDateInvoice(inv);
    setModalNewDueDate(formatForDateInput(inv.dueDate) || new Date().toISOString().split('T')[0]);
    setDueDateReasonNotes('');
    setIsDueDateModalOpen(true);
  };

  // Submit Standalone Due Date update
  const handleConfirmDueDateUpdate = async (e) => {
    if (e) e.preventDefault();
    if (!dueDateInvoice || !modalNewDueDate) {
      if (onNotify) onNotify('Please select a valid new due date.', 'warning');
      return;
    }

    setIsSavingDueDate(true);
    try {
      const res = await clientPaymentService.updateInvoiceDueDate(
        dueDateInvoice.dbId || dueDateInvoice.id || dueDateInvoice.invoiceNumber,
        modalNewDueDate
      );

      if (res.error) {
        if (onNotify) onNotify(res.error.message || 'Failed to update due date.', 'error');
      } else {
        if (onNotify) {
          onNotify(`Updated due date for ${dueDateInvoice.invoiceNumber || dueDateInvoice.id} to ${modalNewDueDate}!`);
        }
        setIsDueDateModalOpen(false);
        await loadLedgerData();
      }
    } catch (err) {
      console.error('Error updating due date:', err);
      if (onNotify) onNotify('Error updating invoice due date.', 'error');
    } finally {
      setIsSavingDueDate(false);
    }
  };

  // Open Email Composer for Individual Invoice Reminder
  const handleOpenInvoiceReminder = (inv) => {
    const emailData = clientPaymentService.generateReminderEmailData(inv);
    setEmailDocData(emailData);
    setIsEmailComposerOpen(true);
  };

  // Open Email Composer for Consolidated Client Statement Reminder
  const handleOpenClientConsolidatedReminder = (client) => {
    const emailData = clientPaymentService.generateConsolidatedReminderEmailData(client);
    setEmailDocData(emailData);
    setIsEmailComposerOpen(true);
  };

  // Email Sent Callback
  const handleEmailSent = () => {
    if (emailDocData) {
      clientPaymentService.logReminderSent({
        invoiceId: emailDocData.id,
        recipient: emailDocData.customerEmail,
        totalBalance: emailDocData.balance
      });
      if (onNotify) {
        onNotify(`Reminder email dispatched to ${emailDocData.customerEmail || emailDocData.customer}.`);
      }
      setIsEmailComposerOpen(false);
      loadLedgerData();
    }
  };


  // Check if invoice matches active period filter
  const matchesPeriod = useCallback((dateObj, period, startStr, endStr) => {
    if (period === 'ALL') return true;
    if (!dateObj) return false;

    const now = new Date();
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();

    if (period === 'THIS_MONTH') {
      return year === now.getFullYear() && month === now.getMonth();
    }
    if (period === 'LAST_MONTH') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return year === lastMonth.getFullYear() && month === lastMonth.getMonth();
    }
    if (period === 'THIS_QUARTER') {
      const curQ = Math.floor(now.getMonth() / 3);
      const invQ = Math.floor(month / 3);
      return year === now.getFullYear() && curQ === invQ;
    }
    if (period === 'FY_2026_27') {
      const fyStart = new Date(2026, 3, 1);
      const fyEnd = new Date(2027, 2, 31, 23, 59, 59);
      return dateObj >= fyStart && dateObj <= fyEnd;
    }
    if (period === 'CUSTOM') {
      if (startStr) {
        const s = new Date(startStr);
        if (dateObj < s) return false;
      }
      if (endStr) {
        const e = new Date(endStr);
        e.setHours(23, 59, 59, 999);
        if (dateObj > e) return false;
      }
      return true;
    }
    return true;
  }, []);

  // Check if invoice matches active aging bucket
  const matchesAging = useCallback((inv, aging) => {
    if (aging === 'ALL') return true;
    if (aging === 'CURRENT') {
      return inv.balanceNum > 0 && !inv.isOverdue;
    }
    if (aging === '1-15') {
      return inv.isOverdue && inv.overdueDays >= 1 && inv.overdueDays <= 15;
    }
    if (aging === '16-30') {
      return inv.isOverdue && inv.overdueDays >= 16 && inv.overdueDays <= 30;
    }
    if (aging === '31-60') {
      return inv.isOverdue && inv.overdueDays >= 31 && inv.overdueDays <= 60;
    }
    if (aging === '60+') {
      return inv.isOverdue && inv.overdueDays > 60;
    }
    return true;
  }, []);

  // Filter invoices strictly by period for metrics and lists
  const periodFilteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = parseInvDate(inv.invoiceDate || inv.date);
      return matchesPeriod(d, periodFilter, customStartDate, customEndDate);
    });
  }, [invoices, periodFilter, customStartDate, customEndDate, matchesPeriod]);

  // Executive KPIs dynamically computed for current period
  const displayedKpis = useMemo(() => {
    const list = periodFilteredInvoices;
    const totalBilled = list.reduce((sum, inv) => sum + (inv.totalNum || 0), 0);
    const totalCollected = list.reduce((sum, inv) => sum + (inv.paidNum || 0), 0);
    const totalReceivables = list.reduce((sum, inv) => sum + (inv.balanceNum || 0), 0);
    const overdueAmount = list.filter(inv => inv.isOverdue).reduce((sum, inv) => sum + (inv.balanceNum || 0), 0);
    const overdueInvoicesCount = list.filter(inv => inv.isOverdue && inv.balanceNum > 0).length;
    const pendingInvoicesCount = list.filter(inv => inv.balanceNum > 0).length;
    const fullyPaidInvoicesCount = list.filter(inv => inv.balanceNum === 0).length;

    const clientsSet = new Set(list.map(i => (i.customer || '').trim()).filter(Boolean));
    const clientsPendingSet = new Set(list.filter(i => i.balanceNum > 0).map(i => (i.customer || '').trim()).filter(Boolean));

    return {
      totalBilled,
      totalCollected,
      totalReceivables,
      overdueAmount,
      overdueInvoicesCount,
      pendingInvoicesCount,
      fullyPaidInvoicesCount,
      clientsWithPendingCount: clientsPendingSet.size,
      totalClientsCount: clientsSet.size,
      collectionEfficiency: totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '100.0'
    };
  }, [periodFilteredInvoices]);

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    return periodFilteredInvoices.filter(inv => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        (inv.invoiceNumber || inv.id || '').toLowerCase().includes(q) ||
        (inv.customer || '').toLowerCase().includes(q) ||
        (inv.customerEmail || '').toLowerCase().includes(q) ||
        (inv.poNumber || '').toLowerCase().includes(q) ||
        (inv.spindleSerial || '').toLowerCase().includes(q)
      );

      // Status filter
      let matchStatus = true;
      if (statusFilter === 'OVERDUE') {
        matchStatus = inv.isOverdue && inv.balanceNum > 0;
      } else if (statusFilter === 'DUE_SOON') {
        matchStatus = inv.dueStatus === 'DUE_SOON' && inv.balanceNum > 0;
      } else if (statusFilter === 'PARTIAL') {
        matchStatus = inv.paidNum > 0 && inv.balanceNum > 0;
      } else if (statusFilter === 'PAID') {
        matchStatus = inv.balanceNum === 0;
      } else if (statusFilter === 'PENDING') {
        matchStatus = inv.balanceNum > 0;
      }

      // Aging filter
      const matchAging = matchesAging(inv, agingFilter);

      // Client filter
      let matchClient = true;
      if (selectedClientFilter !== 'ALL') {
        matchClient = (inv.customer || '').trim() === selectedClientFilter.trim();
      }

      return matchSearch && matchStatus && matchAging && matchClient;
    }).sort((a, b) => {
      if (sortBy === 'overdue') {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.isOverdue && b.isOverdue) return b.overdueDays - a.overdueDays;
        return b.balanceNum - a.balanceNum;
      } else if (sortBy === 'balance_desc') {
        return b.balanceNum - a.balanceNum;
      } else if (sortBy === 'date_desc') {
        const dA = parseInvDate(a.date || a.invoiceDate) || 0;
        const dB = parseInvDate(b.date || b.invoiceDate) || 0;
        return dB - dA;
      }
      return 0;
    });
  }, [periodFilteredInvoices, searchQuery, statusFilter, agingFilter, selectedClientFilter, sortBy, matchesAging]);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clientSummaries.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      return !q || (
        c.clientName.toLowerCase().includes(q) ||
        c.contactEmail.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q)
      );
    });
  }, [clientSummaries, searchQuery]);

  // Filtered Receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      return !q || (
        r.id.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        (r.referenceNumber || '').toLowerCase().includes(q) ||
        (r.paymentMode || '').toLowerCase().includes(q)
      );
    });
  }, [receipts, searchQuery]);

  // Distinct client list for dropdown filter
  const distinctClientNames = useMemo(() => {
    const set = new Set();
    invoices.forEach(i => {
      if (i.customer) set.add(i.customer.trim());
    });
    return Array.from(set).sort();
  }, [invoices]);

  if (isLoading) {
    return <TablePageSkeleton hasMetrics={true} metricCount={4} columns={['110px', '180px', '100px', '90px', '90px', '90px', '80px', '110px']} rows={7} />;
  }

  return (
    <div className="content-area">
      {/* Page Header */}
      <PageHeader 
        title="Client Payments & Receivables" 
        subtitle="Live client payment tracking, automated overdue aging analysis, electronic receipts, and 1-click email reminders"
        badge={`${kpis.pendingInvoicesCount} Invoices Pending Clearance`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={loadLedgerData}
          title="Refresh payment records"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>

        {onNavigate && (
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => onNavigate('invoices')}
            title="Open official Tax Invoices Register"
          >
            <FileText size={14} />
            <span>Tax Invoices Register</span>
          </button>
        )}

        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => handleOpenRecordPayment(null)}
        >
          <Plus size={14} />
          <span>+ Record Payment</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* Executive KPI Metric Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">
                Total Receivables (Pending)
                {periodFilter !== 'ALL' && <span style={{ fontSize: '10.5px', color: 'var(--primary)', fontWeight: 600, marginLeft: '4px' }}>• {periodFilter.replace('_', ' ')}</span>}
              </span>
              <div className="metric-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' }}>
                <DollarSign size={16} />
              </div>
            </div>
            <div className="metric-value" style={{ color: displayedKpis.totalReceivables > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
              ₹{Number(displayedKpis.totalReceivables || 0).toLocaleString('en-IN')}
            </div>
            <div className="metric-footer" style={{ color: 'var(--text-muted)' }}>
              {displayedKpis.pendingInvoicesCount} invoices pending payment
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">
                Critical Overdue Dues
                {periodFilter !== 'ALL' && <span style={{ fontSize: '10.5px', color: 'var(--danger)', fontWeight: 600, marginLeft: '4px' }}>• Filtered</span>}
              </span>
              <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' }}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="metric-value" style={{ color: displayedKpis.overdueAmount > 0 ? 'var(--warning)' : 'var(--success)' }}>
              ₹{Number(displayedKpis.overdueAmount || 0).toLocaleString('en-IN')}
            </div>
            <div className="metric-footer" style={{ color: displayedKpis.overdueInvoicesCount > 0 ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {displayedKpis.overdueInvoicesCount > 0 ? (
                <>
                  <AlertTriangle size={12} />
                  <span>{displayedKpis.overdueInvoicesCount} invoices past due date</span>
                </>
              ) : (
                <>
                  <Check size={12} />
                  <span>No overdue invoices!</span>
                </>
              )}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">
                Total Collections Received
                {periodFilter !== 'ALL' && <span style={{ fontSize: '10.5px', color: 'var(--success)', fontWeight: 600, marginLeft: '4px' }}>• Filtered</span>}
              </span>
              <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="metric-value" style={{ color: 'var(--success)' }}>
              ₹{Number(displayedKpis.totalCollected || 0).toLocaleString('en-IN')}
            </div>
            <div className="metric-footer" style={{ color: 'var(--success)' }}>
              Collection rate: {displayedKpis.collectionEfficiency}%
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Clients with Pending Balance</span>
              <div className="metric-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)' }}>
                <Building2 size={16} />
              </div>
            </div>
            <div className="metric-value">
              {displayedKpis.clientsWithPendingCount} / {displayedKpis.totalClientsCount}
            </div>
            <div className="metric-footer" style={{ color: 'var(--text-muted)' }}>
              {displayedKpis.fullyPaidInvoicesCount} invoices fully settled
            </div>
          </div>
        </div>

        {/* Automatic Overdue Alert Notification Banner */}
        {kpis.overdueInvoicesCount > 0 && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(239,68,68,0.12) 0%, rgba(245,158,11,0.08) 100%)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                  Action Needed: {kpis.overdueInvoicesCount} client invoices totalling ₹{Number(kpis.overdueAmount).toLocaleString('en-IN')} are currently overdue!
                </span>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Automated commercial payment reminder templates with your official ICICI RTGS bank details are ready to dispatch in 1-click.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setStatusFilter('OVERDUE');
                  setActiveTab('invoices');
                }}
              >
                <span>Filter Overdue ({kpis.overdueInvoicesCount})</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Card */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {/* Navigation Tabs Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-subtle)',
            padding: '4px 16px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'invoices' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'invoices' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: activeTab === 'invoices' ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={15} />
                <span>Invoices & Receivables Ledger</span>
                <span style={{ 
                  background: activeTab === 'invoices' ? 'var(--primary)' : 'var(--border-color)', 
                  color: activeTab === 'invoices' ? '#ffffff' : 'var(--text-muted)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  padding: '1px 7px'
                }}>
                  {invoices.length}
                </span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
                onClick={() => setActiveTab('clients')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'clients' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'clients' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: activeTab === 'clients' ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Building2 size={15} />
                <span>Outstanding by Client</span>
                <span style={{ 
                  background: activeTab === 'clients' ? 'var(--primary)' : 'var(--border-color)', 
                  color: activeTab === 'clients' ? '#ffffff' : 'var(--text-muted)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  padding: '1px 7px'
                }}>
                  {clientSummaries.length}
                </span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === 'receipts' ? 'active' : ''}`}
                onClick={() => setActiveTab('receipts')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'receipts' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'receipts' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: activeTab === 'receipts' ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CreditCard size={15} />
                <span>Payment Transactions Log</span>
                <span style={{ 
                  background: activeTab === 'receipts' ? 'var(--primary)' : 'var(--border-color)', 
                  color: activeTab === 'receipts' ? '#ffffff' : 'var(--text-muted)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  padding: '1px 7px'
                }}>
                  {receipts.length}
                </span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'var(--card-bg)'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={
                  activeTab === 'invoices' ? "Search client, invoice #, PO #, serial..." :
                  activeTab === 'clients' ? "Search client organization, email, GSTIN..." :
                  "Search receipt #, client, UTR reference..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '32px', height: '34px', fontSize: '13px' }}
              />
            </div>

            {/* Invoices Specific Filter Pills */}
            {activeTab === 'invoices' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-subtle)', padding: '3px', borderRadius: '6px' }}>
                  {[
                    { id: 'ALL', label: 'All Invoices' },
                    { id: 'OVERDUE', label: `Overdue (${kpis.overdueInvoicesCount})` },
                    { id: 'PENDING', label: `Pending (${kpis.pendingInvoicesCount})` },
                    { id: 'PARTIAL', label: 'Partially Paid' },
                    { id: 'PAID', label: 'Settled' }
                  ].map(pill => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setStatusFilter(pill.id)}
                      style={{
                        border: 'none',
                        background: statusFilter === pill.id ? 'var(--card-bg)' : 'transparent',
                        color: statusFilter === pill.id ? (pill.id === 'OVERDUE' ? 'var(--danger)' : 'var(--primary)') : 'var(--text-muted)',
                        fontWeight: statusFilter === pill.id ? 600 : 500,
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: statusFilter === pill.id ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Filter by Client Dropdown */}
                <select
                  value={selectedClientFilter}
                  onChange={(e) => setSelectedClientFilter(e.target.value)}
                  className="form-control"
                  style={{ height: '34px', fontSize: '12px', minWidth: '160px' }}
                >
                  <option value="ALL">All Clients ({distinctClientNames.length})</option>
                  {distinctClientNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-control"
                  style={{ height: '34px', fontSize: '12px' }}
                >
                  <option value="overdue">Sort: Overdue & Priority First</option>
                  <option value="balance_desc">Sort: Highest Balance First</option>
                  <option value="date_desc">Sort: Newest Invoice Date</option>
                </select>
              </div>
            )}
          </div>

          {/* Secondary Period & Aging Filter Bar */}
          {activeTab === 'invoices' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              background: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-color)',
              fontSize: '12px',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Period & Aging Selectors */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Calendar size={13} color="var(--primary)" />
                  <span>Period:</span>
                </div>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="form-control"
                  style={{ height: '30px', fontSize: '12px', padding: '0 8px', minWidth: '135px' }}
                >
                  <option value="ALL">All Time</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_MONTH">Last Month</option>
                  <option value="THIS_QUARTER">This Quarter</option>
                  <option value="FY_2026_27">FY 2026-27</option>
                  <option value="CUSTOM">Custom Range...</option>
                </select>

                {periodFilter === 'CUSTOM' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="form-control"
                      style={{ height: '30px', fontSize: '11px', padding: '0 6px', width: '130px' }}
                      title="From Date"
                    />
                    <span style={{ color: 'var(--text-muted)' }}>to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="form-control"
                      style={{ height: '30px', fontSize: '11px', padding: '0 6px', width: '130px' }}
                      title="To Date"
                    />
                  </div>
                )}

                <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 2px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Clock size={13} color="var(--warning)" />
                  <span>Aging:</span>
                </div>
                <select
                  value={agingFilter}
                  onChange={(e) => setAgingFilter(e.target.value)}
                  className="form-control"
                  style={{ height: '30px', fontSize: '12px', padding: '0 8px', minWidth: '145px' }}
                >
                  <option value="ALL">All Aging Buckets</option>
                  <option value="CURRENT">Current (Not Due)</option>
                  <option value="1-15">1 - 15 Days Overdue</option>
                  <option value="16-30">16 - 30 Days Overdue</option>
                  <option value="31-60">31 - 60 Days Overdue</option>
                  <option value="60+">60+ Days Overdue (Critical)</option>
                </select>
              </div>

              {/* Status & Reset */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} Tax Invoices
                </span>
                {(periodFilter !== 'ALL' || agingFilter !== 'ALL' || statusFilter !== 'ALL' || selectedClientFilter !== 'ALL' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodFilter('ALL');
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setAgingFilter('ALL');
                      setStatusFilter('ALL');
                      setSelectedClientFilter('ALL');
                      setSearchQuery('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 4px',
                      textDecoration: 'underline'
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: INVOICES & RECEIVABLES LEDGER */}
          {activeTab === 'invoices' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ margin: 0, width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '10px 14px', width: '130px' }}>Invoice & Date</th>
                    <th style={{ padding: '10px 14px' }}>Client Organization</th>
                    <th style={{ padding: '10px 14px', width: '150px' }}>Due Date & Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '110px' }}>Total Billed</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '110px' }}>Amount Paid</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '120px' }}>Pending Balance</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', width: '110px' }}>Reminder Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '220px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={32} style={{ color: 'var(--success)' }} />
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>No invoices matching the selected filters</span>
                          <span style={{ fontSize: '12px' }}>Try switching filter pills or clearing the search query</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isZeroBalance = inv.balanceNum === 0;
                      const hasPartial = inv.paidNum > 0 && !isZeroBalance;

                      return (
                        <tr 
                          key={inv.id}
                          style={{
                            background: inv.isOverdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                            borderBottom: '1px solid var(--border-color)'
                          }}
                        >
                          {/* Invoice & Date */}
                          <td style={{ padding: '12px 14px' }}>
                            <div 
                              style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleViewTaxInvoice(inv)}
                              title="Click to view official Tax Invoice"
                            >
                              <span>{inv.invoiceNumber || inv.id}</span>
                              <ArrowUpRight size={11} style={{ opacity: 0.8 }} />
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Calendar size={11} />
                              <span>{inv.invoiceDate || inv.date}</span>
                            </div>
                            {inv.poNumber && inv.poNumber !== 'VERBAL' && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                PO: {inv.poNumber}
                              </div>
                            )}
                          </td>

                          {/* Client Organization */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {inv.customer || inv.customerFullName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={11} />
                              <span>{inv.customerEmail || 'accounts@client.com'}</span>
                            </div>
                            {inv.customerGstin && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                GST: {inv.customerGstin}
                              </div>
                            )}
                          </td>

                          {/* Due Date & Aging Status */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                                {inv.dueDate || 'Immediate'}
                              </span>
                              {!isZeroBalance && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenManageDueDate(inv)}
                                  title="Manage / Reschedule Due Date for this client"
                                  style={{
                                    background: 'var(--bg-surface-subtle)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <Calendar size={10} />
                                  <span>Reschedule</span>
                                </button>
                              )}
                            </div>
                            {isZeroBalance ? (
                              <span className="badge badge-success" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Check size={11} /> Fully Settled
                              </span>
                            ) : inv.isOverdue ? (
                              <span className="badge badge-danger" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                <AlertTriangle size={11} /> Overdue ({inv.overdueDays}d)
                              </span>
                            ) : inv.dueStatus === 'DUE_SOON' ? (
                              <span className="badge badge-warning" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={11} /> Due in {inv.daysRemaining}d
                              </span>
                            ) : (
                              <span className="badge badge-info" style={{ fontSize: '11px' }}>
                                Current ({inv.daysRemaining}d)
                              </span>
                            )}
                          </td>

                          {/* Total Billed */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500 }}>
                            ₹{Number(inv.totalNum).toLocaleString('en-IN')}
                          </td>

                          {/* Amount Paid */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ color: inv.paidNum > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                              ₹{Number(inv.paidNum).toLocaleString('en-IN')}
                            </div>
                            {inv.totalNum > 0 && (
                              <div style={{
                                width: '100%',
                                height: '4px',
                                background: 'var(--border-color)',
                                borderRadius: '2px',
                                marginTop: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${Math.min(100, Math.round((inv.paidNum / inv.totalNum) * 100))}%`,
                                  height: '100%',
                                  background: isZeroBalance ? 'var(--success)' : 'var(--primary)'
                                }} />
                              </div>
                            )}
                          </td>

                          {/* Pending Balance */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ 
                              fontWeight: 700, 
                              fontSize: '13px',
                              color: isZeroBalance ? 'var(--text-muted)' : (inv.isOverdue ? 'var(--danger)' : 'var(--warning)')
                            }}>
                              ₹{Number(inv.balanceNum).toLocaleString('en-IN')}
                            </div>
                            {hasPartial && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                Partial Paid
                              </div>
                            )}
                          </td>

                          {/* Reminder Status */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {inv.lastReminderSent ? (
                              <div title={`Last reminder dispatched on ${new Date(inv.lastReminderSent).toLocaleString()}`}>
                                <span className="badge badge-info" style={{ fontSize: '10px' }}>
                                  Sent ({inv.reminderCount || 1}x)
                                </span>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {new Date(inv.lastReminderSent).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Not sent
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {/* View Tax Invoice Button */}
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleViewTaxInvoice(inv)}
                                title="Open official Tax Invoice in Billing screen"
                                style={{ gap: '4px', fontSize: '11px', height: '26px', padding: '0 8px' }}
                              >
                                <FileText size={12} color="var(--primary)" />
                                <span>Tax Invoice</span>
                              </button>

                              {/* 1-Click Send Reminder Email Button */}
                              {!isZeroBalance && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenInvoiceReminder(inv)}
                                  style={{
                                    borderColor: inv.isOverdue ? 'rgba(239, 68, 68, 0.4)' : undefined,
                                    color: inv.isOverdue ? 'var(--danger)' : undefined,
                                    fontSize: '11px',
                                    height: '26px',
                                    padding: '0 8px'
                                  }}
                                  title="Draft & send automated reminder email with ICICI bank details"
                                >
                                  <Send size={12} />
                                  <span>Reminder</span>
                                </button>
                              )}

                              {/* Record Payment Button */}
                              {!isZeroBalance ? (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleOpenRecordPayment(inv)}
                                  title="Record incoming payment receipt against this invoice"
                                  style={{ fontSize: '11px', height: '26px', padding: '0 8px', gap: '4px' }}
                                >
                                  <Plus size={12} />
                                  <span>Pay Receipt</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setIsDetailModalOpen(true);
                                  }}
                                  title="View payment receipt details"
                                  style={{ fontSize: '11px', height: '26px', padding: '0 8px', gap: '4px' }}
                                >
                                  <Eye size={12} />
                                  <span>History</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: OUTSTANDING BY CLIENT */}
          {activeTab === 'clients' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ margin: 0, width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '10px 14px' }}>Client Organization</th>
                    <th style={{ padding: '10px 14px' }}>Primary Contact & Email</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', width: '90px' }}>Invoices</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '120px' }}>Total Invoiced</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '120px' }}>Total Collected</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '130px' }}>Outstanding Balance</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '120px' }}>Overdue Amount</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', width: '110px' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '180px' }}>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                        No clients found matching the search query.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => {
                      const hasPending = client.totalOutstanding > 0;

                      return (
                        <tr key={client.clientName} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          {/* Client Organization */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>
                              {client.clientName}
                            </div>
                            {client.gstin && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                GST: {client.gstin}
                              </div>
                            )}
                          </td>

                          {/* Contact & Email */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                              {client.contactEmail}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Tel: {client.contactPhone}
                            </div>
                          </td>

                          {/* Invoice Counts */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{client.invoicesCount}</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              ({client.pendingInvoicesCount} pending)
                            </div>
                          </td>

                          {/* Total Invoiced */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500 }}>
                            ₹{client.totalInvoiced.toLocaleString('en-IN')}
                          </td>

                          {/* Total Collected */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                            ₹{client.totalPaid.toLocaleString('en-IN')}
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {client.collectionRatio}% cleared
                            </div>
                          </td>

                          {/* Outstanding Balance */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <span style={{ 
                              fontWeight: 700, 
                              color: hasPending ? 'var(--warning)' : 'var(--text-muted)',
                              fontSize: '13px' 
                            }}>
                              ₹{client.totalOutstanding.toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Overdue Amount */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <span style={{ 
                              fontWeight: 700, 
                              color: client.totalOverdue > 0 ? 'var(--danger)' : 'var(--text-muted)',
                              fontSize: '13px' 
                            }}>
                              ₹{client.totalOverdue.toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Aging Status Badge */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span className={`badge ${client.clientBadgeClass}`} style={{ fontSize: '11px' }}>
                              {client.clientStatus}
                            </span>
                          </td>

                          {/* Quick Actions */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {hasPending ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenClientConsolidatedReminder(client)}
                                  title="Generate and send consolidated statement of accounts reminder email"
                                >
                                  <Send size={12} />
                                  <span>Send Statement</span>
                                </button>
                              ) : (
                                <span className="badge badge-success" style={{ fontSize: '11px' }}>
                                  All Settled
                                </span>
                              )}

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedClientFilter(client.clientName);
                                  setActiveTab('invoices');
                                }}
                                title="View this client's invoices in ledger"
                              >
                                <ArrowUpRight size={12} />
                                <span>Invoices</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: PAYMENT TRANSACTION RECEIPTS LOG */}
          {activeTab === 'receipts' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ margin: 0, width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '10px 14px', width: '130px' }}>Receipt #</th>
                    <th style={{ padding: '10px 14px', width: '110px' }}>Payment Date</th>
                    <th style={{ padding: '10px 14px' }}>Client Organization</th>
                    <th style={{ padding: '10px 14px', width: '130px' }}>Against Invoice</th>
                    <th style={{ padding: '10px 14px', width: '120px' }}>Mode</th>
                    <th style={{ padding: '10px 14px', width: '160px' }}>Reference / UTR #</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '120px' }}>Amount Received</th>
                    <th style={{ padding: '10px 14px' }}>Notes / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                        No payment receipt records found. Click "+ Record Payment" to log an incoming payment.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((rcp) => (
                      <tr key={rcp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--primary)' }}>
                          {rcp.id}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-main)' }}>
                          {rcp.paymentDate}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          {rcp.customerName}
                        </td>
                        <td 
                          style={{ padding: '12px 14px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.__TARGET_TAX_INVOICE_ID__ = rcp.invoiceNumber || rcp.invoiceId;
                            }
                            if (onNavigate) onNavigate('invoices');
                          }}
                          title="Click to view Tax Invoice in billing"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{rcp.invoiceNumber || rcp.invoiceId}</span>
                            <ArrowUpRight size={11} style={{ opacity: 0.8 }} />
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className="badge badge-info" style={{ fontSize: '11px' }}>
                            {rcp.paymentMode}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '12px' }}>
                          {rcp.referenceNumber || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontSize: '13px' }}>
                          ₹{Number(rcp.amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {rcp.notes || 'Payment receipt processed'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RECORD PAYMENT RECEIPT MODAL */}
      {isRecordModalOpen && (
        <Modal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          title="Record Client Payment Receipt"
          width="580px"
        >
          <form onSubmit={handleConfirmPayment}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Invoice Selection Dropdown */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                  Select Invoice to Apply Payment *
                </label>
                <select
                  value={formInvoiceId}
                  onChange={(e) => handleFormInvoiceChange(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', height: '36px' }}
                  required
                >
                  <option value="">-- Choose Invoice --</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber || inv.id} — {inv.customer} (Pending: ₹{inv.balanceNum.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Invoice Details Callout */}
              {selectedInvoice && (
                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  fontSize: '12px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Client: </span>
                    <strong>{selectedInvoice.customer || selectedInvoice.customerFullName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Due Date: </span>
                    <strong style={{ color: selectedInvoice.isOverdue ? 'var(--danger)' : 'inherit' }}>
                      {selectedInvoice.dueDate} {selectedInvoice.isOverdue ? `(Overdue ${selectedInvoice.overdueDays}d)` : ''}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Total Billed: </span>
                    <span>₹{selectedInvoice.totalNum.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Current Balance Due: </span>
                    <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '13px' }}>
                      ₹{selectedInvoice.balanceNum.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {/* Amount & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="Enter amount received"
                    className="form-control"
                    required
                  />
                  {selectedInvoice && selectedInvoice.balanceNum > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
                        onClick={() => setFormAmount(String(selectedInvoice.balanceNum))}
                      >
                        Full Balance (₹{selectedInvoice.balanceNum.toLocaleString('en-IN')})
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
                        onClick={() => setFormAmount(String(Math.round(selectedInvoice.balanceNum * 0.5)))}
                      >
                        50% (₹{Math.round(selectedInvoice.balanceNum * 0.5).toLocaleString('en-IN')})
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
                        onClick={() => setFormAmount('')}
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {/* Real-Time Live Calculation Callout */}
                  {selectedInvoice && formAmount && Number(formAmount) > 0 && (
                    <div style={{
                      marginTop: '8px',
                      background: 'rgba(2, 132, 199, 0.05)',
                      border: '1px dashed rgba(2, 132, 199, 0.3)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '11.5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>
                        New Paid: <strong>₹{(selectedInvoice.paidNum + Number(formAmount)).toLocaleString('en-IN')}</strong>
                      </span>
                      <span>
                        Remaining: <strong style={{ color: Math.max(0, selectedInvoice.balanceNum - Number(formAmount)) === 0 ? 'var(--success)' : 'var(--warning)' }}>
                          ₹{Math.max(0, selectedInvoice.balanceNum - Number(formAmount)).toLocaleString('en-IN')}
                        </strong>
                      </span>
                      <span>
                        Status: <strong style={{ color: Number(formAmount) >= selectedInvoice.balanceNum ? 'var(--success)' : '#0284c7' }}>
                          {Number(formAmount) >= selectedInvoice.balanceNum ? 'Fully Paid' : 'Partially Paid'}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Payment Received Date *
                  </label>
                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* Client Due Date Management in Record Payment Modal */}
              <div style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Calendar size={13} color="var(--primary)" />
                    <span>Client Payment Due Date Schedule</span>
                  </label>
                  {selectedInvoice && (
                    <span style={{ fontSize: '11.5px', color: selectedInvoice.isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                      Current Due: <strong>{selectedInvoice.dueDate || 'N/A'}</strong> {selectedInvoice.isOverdue ? `(Overdue ${selectedInvoice.overdueDays}d)` : ''}
                    </span>
                  )}
                </div>

                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={isUpdatingDueDateInPayment}
                    onChange={(e) => setIsUpdatingDueDateInPayment(e.target.checked)}
                    style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                  />
                  <span style={{ fontWeight: 500 }}>
                    Update / Reschedule Client Due Date for Remaining Balance
                  </span>
                </label>

                {isUpdatingDueDateInPayment && (
                  <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="date"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        className="form-control"
                        style={{ height: '34px', fontSize: '12.5px' }}
                        required={isUpdatingDueDateInPayment}
                      />
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', height: '28px', padding: '0 8px' }}
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 7);
                            setFormDueDate(d.toISOString().split('T')[0]);
                          }}
                        >
                          +7 Days
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', height: '28px', padding: '0 8px' }}
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 15);
                            setFormDueDate(d.toISOString().split('T')[0]);
                          }}
                        >
                          +15 Days
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', height: '28px', padding: '0 8px' }}
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 30);
                            setFormDueDate(d.toISOString().split('T')[0]);
                          }}
                        >
                          +30 Days
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Info size={12} />
                      <span>Updates the invoice commitment deadline and recalculates overdue aging status across the ERP.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Mode & Deposited Bank */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Payment Remittance Mode *
                  </label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value)}
                    className="form-control"
                  >
                    <option value="NEFT/RTGS">NEFT / RTGS Electronic Transfer</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="UPI">UPI (Google Pay / PhonePe / BHIM)</option>
                    <option value="Wire Transfer">International Wire Transfer (SWIFT)</option>
                    <option value="Demand Draft">Bank Demand Draft (DD)</option>
                    <option value="Cash">Cash Receipt</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Deposited Bank Account
                  </label>
                  <input
                    type="text"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    placeholder="e.g. ICICI Bank Ltd (GPS A/c 349105000701)"
                    className="form-control"
                  />
                </div>
              </div>

              {/* UTR / Reference Number */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                  Bank Reference Number / UTR / Cheque Number
                </label>
                <input
                  type="text"
                  value={formReferenceNumber}
                  onChange={(e) => setFormReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR-ICIC8392104 or Cheque #492019"
                  className="form-control"
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                  Payment Remarks & Receipt Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Advance cleared via NEFT against spindle rebuild dispatch inspection"
                  rows="2"
                  className="form-control"
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRecordModalOpen(false)}
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingPayment}
                >
                  <Check size={14} />
                  <span>{isSubmittingPayment ? 'Recording...' : 'Record Payment & Update Invoice'}</span>
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* INVOICE PAYMENT HISTORY MODAL */}
      {isDetailModalOpen && selectedInvoice && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Payment History — ${selectedInvoice.invoiceNumber || selectedInvoice.id}`}
          width="640px"
        >
          <div>
            <div style={{
              background: 'var(--bg-subtle)',
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px'
            }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>
                {selectedInvoice.customer || selectedInvoice.customerFullName}
              </div>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                <span>Total: <strong>₹{selectedInvoice.totalNum.toLocaleString('en-IN')}</strong></span>
                <span>Paid: <strong style={{ color: 'var(--success)' }}>₹{selectedInvoice.paidNum.toLocaleString('en-IN')}</strong></span>
                <span>Balance: <strong style={{ color: selectedInvoice.balanceNum > 0 ? 'var(--danger)' : 'var(--success)' }}>₹{selectedInvoice.balanceNum.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Payment Receipts Received:</h4>
            {selectedInvoice.paymentReceipts && selectedInvoice.paymentReceipts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedInvoice.paymentReceipts.map((rcp) => (
                  <div key={rcp.id} style={{
                    border: '1px solid var(--border-color)',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--primary)' }}>
                        {rcp.id} • {rcp.paymentDate}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Mode: {rcp.paymentMode} | Ref: {rcp.referenceNumber || 'N/A'}
                      </div>
                      {rcp.notes && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {rcp.notes}
                        </div>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--success)' }}>
                      ₹{Number(rcp.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No separate receipt transactions recorded yet for this invoice.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleViewTaxInvoice(selectedInvoice);
                }}
                style={{ gap: '6px' }}
              >
                <FileText size={13} />
                <span>Open Official Tax Invoice</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* STANDALONE MANAGE CLIENT DUE DATE MODAL */}
      {isDueDateModalOpen && dueDateInvoice && (
        <Modal
          isOpen={isDueDateModalOpen}
          onClose={() => setIsDueDateModalOpen(false)}
          title={`Manage Client Due Date: ${dueDateInvoice.invoiceNumber || dueDateInvoice.id}`}
        >
          <form onSubmit={handleConfirmDueDateUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Client: </span>
                <strong>{dueDateInvoice.customer || dueDateInvoice.customerFullName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Current Due Date: </span>
                <strong style={{ color: dueDateInvoice.isOverdue ? 'var(--danger)' : 'inherit' }}>
                  {dueDateInvoice.dueDate || 'N/A'} {dueDateInvoice.isOverdue ? `(Overdue ${dueDateInvoice.overdueDays}d)` : ''}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Total Billed: </span>
                <span>₹{dueDateInvoice.totalNum.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Pending Balance: </span>
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
                  ₹{dueDateInvoice.balanceNum.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                New Payment Due Date *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={modalNewDueDate}
                  onChange={(e) => setModalNewDueDate(e.target.value)}
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px' }}
                  required
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', height: '32px', padding: '0 9px' }}
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setModalNewDueDate(d.toISOString().split('T')[0]);
                    }}
                  >
                    +7 Days
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', height: '32px', padding: '0 9px' }}
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 15);
                      setModalNewDueDate(d.toISOString().split('T')[0]);
                    }}
                  >
                    +15 Days
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', height: '32px', padding: '0 9px' }}
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setModalNewDueDate(d.toISOString().split('T')[0]);
                    }}
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', height: '32px', padding: '0 9px' }}
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 45);
                      setModalNewDueDate(d.toISOString().split('T')[0]);
                    }}
                  >
                    +45 Days
                  </button>
                </div>
              </div>
            </div>

            {/* Projected Status Preview */}
            {modalNewDueDate && (
              <div style={{
                background: 'rgba(2, 132, 199, 0.05)',
                border: '1px dashed rgba(2, 132, 199, 0.3)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Clock size={14} color="#0284c7" />
                <span>
                  {(() => {
                    const parsed = parseInvDate(modalNewDueDate);
                    if (!parsed) return 'Please select a valid date';
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) {
                      return `Selected date is ${Math.abs(diffDays)} days in the past (Overdue).`;
                    } else if (diffDays === 0) {
                      return 'Status will be: Due Today.';
                    } else if (diffDays <= 7) {
                      return `Status will be: Due Soon (in ${diffDays} days).`;
                    } else {
                      return `Status will be: Current / Not Due (in ${diffDays} days).`;
                    }
                  })()}
                </span>
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                Reschedule Reason & Commercial Notes (Optional)
              </label>
              <textarea
                value={dueDateReasonNotes}
                onChange={(e) => setDueDateReasonNotes(e.target.value)}
                placeholder="e.g. Client requested extension pending spindle testing inspection"
                rows="2"
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDueDateModalOpen(false)}
                disabled={isSavingDueDate}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSavingDueDate}
                style={{ gap: '6px' }}
              >
                {isSavingDueDate ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Update Due Date</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* OUTLOOK-STYLE EMAIL COMPOSER MODAL FOR PAYMENT REMINDERS */}
      {isEmailComposerOpen && emailDocData && (
        <OutlookEmailComposer 
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          documentData={emailDocData}
          documentType="payment_reminder"
          onNotify={onNotify}
          onSent={handleEmailSent}
        />
      )}
    </div>
  );
}
