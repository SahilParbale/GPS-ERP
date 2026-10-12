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
  ChevronRight, AlertCircle, Check, Eye
} from 'lucide-react';

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
  const [formPaymentMode, setFormPaymentMode] = useState('NEFT/RTGS');
  const [formReferenceNumber, setFormReferenceNumber] = useState('');
  const [formBankName, setFormBankName] = useState('ICICI Bank Ltd');
  const [formNotes, setFormNotes] = useState('');

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

  // Open Record Payment Modal for a specific invoice
  const handleOpenRecordPayment = (inv = null) => {
    if (inv) {
      setSelectedInvoice(inv);
      setFormInvoiceId(inv.id);
      setFormAmount(inv.balanceNum > 0 ? String(inv.balanceNum) : '');
      setFormNotes(`Payment received against ${inv.invoiceNumber || inv.id}`);
    } else {
      // Find first pending invoice if available
      const firstPending = invoices.find(i => i.balanceNum > 0) || invoices[0];
      if (firstPending) {
        setSelectedInvoice(firstPending);
        setFormInvoiceId(firstPending.id);
        setFormAmount(firstPending.balanceNum > 0 ? String(firstPending.balanceNum) : '');
        setFormNotes(`Payment received against ${firstPending.invoiceNumber || firstPending.id}`);
      } else {
        setSelectedInvoice(null);
        setFormInvoiceId('');
        setFormAmount('');
        setFormNotes('');
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
        notes: formNotes
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

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
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

      // Client filter
      let matchClient = true;
      if (selectedClientFilter !== 'ALL') {
        matchClient = (inv.customer || '').trim() === selectedClientFilter.trim();
      }

      return matchSearch && matchStatus && matchClient;
    }).sort((a, b) => {
      if (sortBy === 'overdue') {
        // Overdue first by days descending, then pending, then settled
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.isOverdue && b.isOverdue) return b.overdueDays - a.overdueDays;
        return b.balanceNum - a.balanceNum;
      } else if (sortBy === 'balance_desc') {
        return b.balanceNum - a.balanceNum;
      } else if (sortBy === 'date_desc') {
        return new Date(b.date || b.invoiceDate) - new Date(a.date || a.invoiceDate);
      }
      return 0;
    });
  }, [invoices, searchQuery, statusFilter, selectedClientFilter, sortBy]);

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
              <span className="metric-label">Total Receivables (Pending)</span>
              <div className="metric-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' }}>
                <DollarSign size={16} />
              </div>
            </div>
            <div className="metric-value" style={{ color: kpis.totalReceivables > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
              ₹{Number(kpis.totalReceivables || 0).toLocaleString('en-IN')}
            </div>
            <div className="metric-footer" style={{ color: 'var(--text-muted)' }}>
              {kpis.pendingInvoicesCount} invoices pending payment
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Critical Overdue Dues</span>
              <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' }}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="metric-value" style={{ color: kpis.overdueAmount > 0 ? 'var(--warning)' : 'var(--success)' }}>
              ₹{Number(kpis.overdueAmount || 0).toLocaleString('en-IN')}
            </div>
            <div className="metric-footer" style={{ color: kpis.overdueInvoicesCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {kpis.overdueInvoicesCount > 0 ? `⚠️ ${kpis.overdueInvoicesCount} invoices past due date` : 'No overdue invoices!'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Collections Received</span>
              <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="metric-value" style={{ color: 'var(--success)' }}>
              ₹{Number(kpis.totalCollected || 0).toLocaleString('en-IN')}
            </div>
            <div className="metric-footer" style={{ color: 'var(--success)' }}>
              Collection rate: {kpis.collectionEfficiency}%
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
              {kpis.clientsWithPendingCount} / {kpis.totalClientsCount}
            </div>
            <div className="metric-footer" style={{ color: 'var(--text-muted)' }}>
              {kpis.fullyPaidInvoicesCount} invoices fully settled
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
                            <div style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{inv.invoiceNumber || inv.id}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)', marginBottom: '4px' }}>
                              {inv.dueDate || 'Immediate'}
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
                              {/* 1-Click Send Reminder Email Button */}
                              {!isZeroBalance && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenInvoiceReminder(inv)}
                                  style={{
                                    borderColor: inv.isOverdue ? 'rgba(239, 68, 68, 0.4)' : undefined,
                                    color: inv.isOverdue ? 'var(--danger)' : undefined
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
                        <td style={{ padding: '12px 14px', color: 'var(--primary)' }}>
                          {rcp.invoiceNumber || rcp.invoiceId}
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
                    <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px', cursor: 'pointer' }}
                         onClick={() => setFormAmount(String(selectedInvoice.balanceNum))}>
                      Click to auto-fill full balance: ₹{selectedInvoice.balanceNum.toLocaleString('en-IN')}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
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
