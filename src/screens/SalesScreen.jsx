import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { salesService } from '../services/database/salesService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportQuotationPdf, exportElementAsPdf, numberToIndianWords } from '../utils/pdfGenerator';
import { 
  Search, Plus, Eye, Printer, CheckCircle, FileText, 
  Send, DollarSign, ArrowRight, Download, Trash2, Edit3, 
  Check, RefreshCw, X, FileCheck, Building2, User, Phone, 
  MapPin, Hash, Maximize2, Minimize2, ChevronRight, Mail, AlertCircle,
  Loader2, Calendar, Clock, XCircle
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import UpiQrCode from '../components/common/UpiQrCode';
import { getActiveUpiId, DEFAULT_BANK_DETAILS } from '../utils/upiQrGenerator';


const DEFAULT_LINAMAR_TEMPLATE = {
  estimateNo: 'QTN/2026-27/294',
  date: '07-09-2026',
  status: 'Draft',
  placeOfSupply: '23-Madhya Pradesh',
  customer: 'LINAMAR INDIA PRIVATE LIMITED',
  customerAddress: 'Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas, Dewas, Madhya Pradesh-455001, India',
  contactNo: '7773877714',
  gstin: '23AACCL5351J1ZM',
  state: '23-Madhya Pradesh',
  spindleSerial: 'HMMXXVI',
  challanNo: 'N/A',
  inwardDate: '22-08-2026',
  scopeOfWork: `1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. HSK -63 SHAFT SLEEVING\n6. MFG OF DRAWBAR LOCKNUT\n7. MFG OF TOOL CLAMP DICLAMP PLATE .\n8. STATOR INSPECTION.\n9. STATIC TEST.\n10. ASSEMBLY\n11. DYANAMIC TEST.`,
  taxRate: 18,
  bankName: 'ICICI BANK LIMITED, PUNE NANDED CITY',
  accountNo: '349105000701',
  ifscCode: 'ICIC0003491',
  accountHolder: 'GENERAL PRECISION SPINDLES',
  upiId: '7058731515@hdfc',
  msmeNo: 'MH26A0189736',
  enterpriseType: 'SPINDLE MANUFACTURING AND REPAIRING',
  terms: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
  items: [
    { id: 1, name: 'REPAIRING OF KESSLAR HSK-63 SPINDLE', hsn: '84669390', qty: 1, unitPrice: 110000 },
    { id: 2, name: 'SHAFT SLEEVING', hsn: '998717', qty: 1, unitPrice: 225000 },
    { id: 3, name: 'MANUFACTURING OF DRAWBAR LOCKNUT', hsn: '998717', qty: 1, unitPrice: 7500 },
    { id: 4, name: 'MANUFACTURING OF TOOL CLAMP DICLAMP PLATE', hsn: '998717', qty: 1, unitPrice: 7500 },
    { id: 5, name: 'HC7014-EDLR-T-P4S-UL -FAG MAKE.', hsn: '', qty: 2, unitPrice: 96000 },
    { id: 6, name: 'N1011-D-K-TVP-SP-XL', hsn: '84821012', qty: 1, unitPrice: 18000 },
    { id: 7, name: 'STATOR INSPECTION', hsn: '998717', qty: 1, unitPrice: 15000 },
  ]
};

export default function SalesScreen({ onNavigate, onNotify }) {
  const [quotations, setQuotations] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [isDocExpanded, setIsDocExpanded] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadQuotations = async (preferredId = null) => {
    setIsLoading(true);
    setError(null);
    const res = await salesService.getQuotations();
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    }
    const data = res.data || [];
    setQuotations(data);

    setSelectedQuote(prev => {
      const targetId = preferredId || (prev ? (prev.estimateNo || prev.id) : null);
      if (targetId) {
        const match = data.find(q => q.id === targetId || q.estimateNo === targetId || q.dbId === targetId);
        if (match) return match;
      }
      return data[0] || null;
    });
    setIsLoading(false);
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  // Email state
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [emailDoc, setEmailDoc] = useState(null);

  const handleOpenEmailForQuote = (quote) => {
    setEmailDoc(quote);
    setIsEmailComposerOpen(true);
  };

  const handleEmailSent = (record) => {
    if (onNotify) onNotify(`Quotation estimate email sent successfully`);
  };

  const handleEmailSaveDraft = (draftRecord) => {
    if (onNotify) onNotify('Draft quotation email saved');
  };

  // New Quotation Form State matching the PDF invoice
  const [formState, setFormState] = useState({ ...DEFAULT_LINAMAR_TEMPLATE });

  // Calculate live totals for the modal form
  const formCalculations = useMemo(() => {
    const subtotal = formState.items.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.unitPrice || 0)), 0);
    const taxAmount = Math.round(subtotal * (Number(formState.taxRate || 18) / 100));
    const totalAmount = subtotal + taxAmount;
    const totalQty = formState.items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
    const amountInWords = numberToIndianWords(totalAmount);

    return { subtotal, taxAmount, totalAmount, totalQty, amountInWords };
  }, [formState.items, formState.taxRate]);

  const filteredQuotes = useMemo(() => {
    return quotations.filter((q) => {
      const matchesStatus = 
        statusFilter === 'all'
          ? true
          : q.status?.toLowerCase() === statusFilter.toLowerCase();

      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || 
        q.id?.toLowerCase().includes(query) ||
        q.customer?.toLowerCase().includes(query) ||
        (q.spindleSerial && q.spindleSerial.toLowerCase().includes(query)) ||
        (q.contactPerson && q.contactPerson.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [quotations, statusFilter, searchQuery]);

  // Status update function handling Under Review, Approved, Draft, and Rejected
  const handleUpdateStatus = async (quoteId, newStatus) => {
    const targetQuote = quotations.find(q => q.id === quoteId || q.dbId === quoteId);
    if (!targetQuote) return;

    const idToUpdate = targetQuote.dbId || targetQuote.id;
    const res = await salesService.updateQuotationStatus(idToUpdate, newStatus);
    if (res.error) {
      if (onNotify) onNotify(res.error.message || `Failed to update quotation to ${newStatus}`, 'error');
      return;
    }

    setQuotations(prev => prev.map(q => {
      if (q.id === targetQuote.id || q.dbId === targetQuote.dbId) {
        return { ...q, status: newStatus, rawStatus: newStatus === 'Under Review' ? 'Sent' : newStatus };
      }
      return q;
    }));

    setSelectedQuote(prev => {
      if (prev && (prev.id === targetQuote.id || prev.dbId === targetQuote.dbId)) {
        return { ...prev, status: newStatus, rawStatus: newStatus === 'Under Review' ? 'Sent' : newStatus };
      }
      return prev;
    });

    if (onNotify) {
      onNotify(`Quotation ${targetQuote.id} marked as "${newStatus}"`, 'success');
    }
  };

  // Delete quotation confirmation & execution
  const confirmDeleteQuotation = (quote) => {
    setQuoteToDelete(quote);
  };

  const handleExecuteDelete = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);
    const idToDelete = quoteToDelete.dbId || quoteToDelete.id;
    const quoteNo = quoteToDelete.estimateNo || quoteToDelete.id;

    const res = await salesService.deleteQuotation(idToDelete);
    if (res.error) {
      if (onNotify) onNotify(res.error.message || `Failed to delete quotation ${quoteNo}`, 'error');
      setIsDeleting(false);
      return;
    }

    const remaining = quotations.filter(q => q.id !== quoteToDelete.id && q.dbId !== quoteToDelete.dbId);
    setQuotations(remaining);

    setSelectedQuote(prev => {
      if (prev && (prev.id === quoteToDelete.id || prev.dbId === quoteToDelete.dbId)) {
        return remaining[0] || null;
      }
      return prev;
    });

    if (onNotify) {
      onNotify(`Quotation / Invoice ${quoteNo} deleted successfully`, 'success');
    }
    setIsDeleting(false);
    setQuoteToDelete(null);
  };

  // Add line item in modal
  const handleAddItem = () => {
    setFormState(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), name: '', hsn: '998717', qty: 1, unitPrice: 0 }
      ]
    }));
  };

  // Remove line item in modal
  const handleRemoveItem = (id) => {
    if (formState.items.length <= 1) {
      onNotify('A quotation must contain at least one line item', 'warning');
      return;
    }
    setFormState(prev => ({
      ...prev,
      items: prev.items.filter(it => it.id !== id)
    }));
  };

  // Update line item property
  const handleItemChange = (id, field, val) => {
    setFormState(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === id ? { ...it, [field]: val } : it)
    }));
  };

  // Reset to LINAMAR template
  const handleResetToLinamar = () => {
    setFormState({ ...DEFAULT_LINAMAR_TEMPLATE });
    onNotify('Loaded Linamar Kesslar estimate fields from PDF template');
  };

  // Submit and create new quotation in live Supabase
  const handleCreateQuotation = async (e) => {
    e.preventDefault();

    if (!formState.customer.trim()) {
      onNotify('Please enter a Customer / Company name', 'warning');
      return;
    }

    // Always generate a unique quotation number to avoid unique-constraint 400 errors.
    // Use the form's estimateNo only if the user explicitly changed it from a generated one;
    // fall back to a timestamp-based unique number.
    const now = new Date();
    const fy = now.getMonth() >= 3
      ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
      : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;
    const seq = String(Date.now()).slice(-5);
    // If the estimateNo still looks like the default template value, generate a fresh one
    const isDefaultNo = formState.estimateNo === 'QTN/2026-27/294' || !formState.estimateNo;
    const qNo = isDefaultNo
      ? `QTN/${fy}/${seq}`
      : formState.estimateNo;

    const res = await salesService.createQuotation({
      quotationNumber: qNo,
      customerName: formState.customer,
      customerAddress: formState.customerAddress,
      customerGstin: formState.gstin,
      placeOfSupply: formState.placeOfSupply,
      spindleSerial: formState.spindleSerial,
      scopeOfWork: formState.scopeOfWork,
      subtotal: formCalculations.subtotal,
      totalAmount: formCalculations.totalAmount,
      status: formState.status || 'Draft',
      terms: formState.terms,
      items: formState.items
    });

    if (res.error) {
      onNotify(res.error.message || 'Failed to create quotation in database.', 'error');
      return;
    }

    setStatusFilter('all');
    setSearchQuery('');
    setIsNewQuoteOpen(false);
    onNotify(`Estimate ${qNo} created successfully for ${formState.customer}`);
    await loadQuotations(qNo);
  };

  const handlePrint = async () => {
    if (!selectedQuote) return;
    try {
      // Use jsPDF direct generator as primary (pixel-perfect 1:1 match to reference format)
      await exportQuotationPdf(selectedQuote);
      if (onNotify) onNotify(`Quotation Estimate ${selectedQuote.estimateNo || selectedQuote.id} downloaded (PDF)`);
    } catch (err) {
      console.error('Failed to export quotation PDF:', err);
      if (onNotify) onNotify('PDF export failed. Please try again.', 'error');
    }
  };

  if (isLoading) {
    return <TablePageSkeleton columns={['140px', '180px', '120px', '100px', '90px', '80px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Sales Enquiries, Quotations & Commercial Orders" 
          subtitle="Customer precision spindle proposals, GST calculations, and line items"
          badge="Database Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {error.message || 'Unable to retrieve commercial quotations from PostgreSQL database.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadQuotations}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Sales Enquiries, Quotations & Commercial Orders" 
        subtitle="Customer precision spindle proposals, GST calculations, and line items"
        badge={`${quotations.length} Active Proposals`}
      >
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => {
            // Generate a unique estimate number each time the modal opens
            const now = new Date();
            const fy = now.getMonth() >= 3
              ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
              : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;
            const seq = String(Date.now()).slice(-5);
            setFormState({
              ...DEFAULT_LINAMAR_TEMPLATE,
              estimateNo: `QTN/${fy}/${seq}`,
              date: now.toISOString().split('T')[0],
              status: 'Draft'
            });
            setIsNewQuoteOpen(true);
          }}
        >
          <Plus size={14} />
          <span>New Quotation</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* Quotations Master-Detail View */}
        <div 
          className="grid-2col-sales" 
          style={{ 
            gridTemplateColumns: isDocExpanded ? '1fr' : undefined,
            gap: '12px'
          }}
        >
        {/* Left Column: Compact Master Quotations List */}
        {!isDocExpanded && (
          <div className="section-card" style={{ height: 'fit-content', padding: '0', overflow: 'hidden' }}>
            {/* Filter Header */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>Quotations ({filteredQuotes.length})</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Select to preview</span>
              </div>
              
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Search Quote #, Customer, Serial..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ height: '28px', fontSize: '11px', paddingLeft: '28px' }}
                />
              </div>

              <CustomSelect 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="sm"
                style={{ width: '160px' }}
              >
                <option value="all">All Statuses ({quotations.length})</option>
                <option value="under review">Under Review ({quotations.filter(q => q.status?.toLowerCase() === 'under review').length})</option>
                <option value="approved">Approved ({quotations.filter(q => q.status?.toLowerCase() === 'approved').length})</option>
                <option value="draft">Draft ({quotations.filter(q => q.status?.toLowerCase() === 'draft').length})</option>
                <option value="rejected">Rejected ({quotations.filter(q => q.status?.toLowerCase() === 'rejected').length})</option>
              </CustomSelect>
            </div>

            {/* Scrollable Master List */}
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {filteredQuotes.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No quotations match your search.
                </div>
              ) : (
                filteredQuotes.map((q) => {
                  const isSelected = selectedQuote?.id === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuote(q)}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--border-color)',
                        borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                        background: isSelected ? '#f0f9ff' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <span className="mono" style={{ fontWeight: 700, fontSize: '12px', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                          {q.id}
                        </span>
                        <StatusBadge status={q.status} size="sm" />
                      </div>

                      <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {q.customer}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span>{q.date}</span>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '12px' }}>
                          ₹{q.totalAmount?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {q.spindleSerial && (
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Serial: <strong className="mono">{q.spindleSerial}</strong>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {q.validUntil ? `Valid: ${q.validUntil}` : '30d Validity'}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ height: '22px', padding: '0 6px', fontSize: '10.5px', gap: '3px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedQuote(q);
                            }}
                            title="Preview Estimate"
                          >
                            <Eye size={10} />
                            <span>View</span>
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-primary btn-sm"
                            style={{ height: '22px', padding: '0 6px', fontSize: '10.5px', gap: '3px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEmailForQuote(q);
                            }}
                            title="Send quotation via Outlook-style email"
                          >
                            <Mail size={10} />
                            <span>Send Email</span>
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-sm"
                            style={{ 
                              height: '22px', 
                              padding: '0 6px', 
                              fontSize: '10.5px', 
                              gap: '3px',
                              background: '#fee2e2',
                              border: '1px solid #fca5a5',
                              color: '#dc2626'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteQuotation(q);
                            }}
                            title="Delete Quotation / Invoice"
                          >
                            <Trash2 size={10} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Column: Authentic PDF Invoice Document View */}
        {selectedQuote && (() => {
          return (
            <div className="section-card" style={{ padding: '0', overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Top Action Header with Under Review, Approved, Draft, and Rejected Functions */}
              <div style={{ 
                padding: '10px 14px', 
                background: 'var(--bg-surface-subtle)', 
                borderBottom: '1px solid var(--border-color)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '14px' }}>{selectedQuote.id}</span>
                  <StatusBadge status={selectedQuote.status} size="sm" />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {selectedQuote.customer}</span>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* 1-Click Status Transition Buttons */}
                  {selectedQuote.status !== 'Approved' && (
                    <button 
                      type="button" 
                      className="btn btn-sm"
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'Approved')}
                      title="Approve this quotation"
                      style={{
                        height: '28px',
                        fontSize: '11px',
                        padding: '0 8px',
                        gap: '4px',
                        background: '#ecfdf5',
                        border: '1px solid #10b981',
                        color: '#065f46',
                        fontWeight: 600
                      }}
                    >
                      <CheckCircle size={12} color="#059669" />
                      <span>Approve</span>
                    </button>
                  )}

                  {selectedQuote.status !== 'Under Review' && (
                    <button 
                      type="button" 
                      className="btn btn-sm"
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'Under Review')}
                      title="Mark as Under Review"
                      style={{
                        height: '28px',
                        fontSize: '11px',
                        padding: '0 8px',
                        gap: '4px',
                        background: '#fffbeb',
                        border: '1px solid #f59e0b',
                        color: '#92400e',
                        fontWeight: 600
                      }}
                    >
                      <Clock size={12} color="#d97706" />
                      <span>Under Review</span>
                    </button>
                  )}

                  {selectedQuote.status !== 'Rejected' && (
                    <button 
                      type="button" 
                      className="btn btn-sm"
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'Rejected')}
                      title="Reject this quotation"
                      style={{
                        height: '28px',
                        fontSize: '11px',
                        padding: '0 8px',
                        gap: '4px',
                        background: '#fef2f2',
                        border: '1px solid #f87171',
                        color: '#991b1b',
                        fontWeight: 600
                      }}
                    >
                      <XCircle size={12} color="#dc2626" />
                      <span>Reject</span>
                    </button>
                  )}

                  {selectedQuote.status !== 'Draft' && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'Draft')}
                      title="Revert quotation to Draft"
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                    >
                      <FileText size={12} />
                      <span>Draft</span>
                    </button>
                  )}

                  <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 2px' }} />

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEmailForQuote(selectedQuote)}
                    title="Send quotation via Outlook-style email composer"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                  >
                    <Mail size={12} color="var(--primary)" />
                    <span>Send Email</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={handlePrint}
                    title="Print official Estimate / Invoice"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                  >
                    <Printer size={12} />
                    <span>Print PDF</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsDocExpanded(!isDocExpanded)}
                    title={isDocExpanded ? "Split view" : "Full screen preview"}
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                  >
                    {isDocExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    <span>{isDocExpanded ? "Split View" : "Full Screen"}</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-sm"
                    onClick={() => confirmDeleteQuotation(selectedQuote)}
                    title="Delete this quotation / invoice"
                    style={{ 
                      height: '28px', 
                      fontSize: '11px', 
                      padding: '0 8px', 
                      gap: '4px',
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      color: '#dc2626',
                      fontWeight: 600
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

            {/* Document Body — A4 Page Preview */}
            <div style={{ background: '#525659', padding: '24px 16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', overflowX: 'auto', flex: 1, minHeight: '0' }}>
              <div 
                id="printable-quotation" 
                style={{ 
                  width: '794px',
                  minWidth: '794px',
                  maxWidth: '794px',
                  height: '1123px',
                  minHeight: '1123px',
                  maxHeight: '1123px',
                  background: '#ffffff', 
                  padding: '24px 28px', 
                  color: '#000000', 
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
                  boxSizing: 'border-box',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Document Title Banner */}
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#000000', marginBottom: '6px', letterSpacing: '0.02em', flexShrink: 0 }}>
                  Estimate
                </div>

                {/* Outer Document Border Box */}
                <div style={{ 
                  border: '1px solid #b8b8b8', 
                  background: '#ffffff', 
                  boxSizing: 'border-box', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  flex: 1, 
                  minHeight: 0 
                }}>

                  {/* Company Header & Metadata Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                    {/* Left: Company Logo & Details */}
                    <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <img 
                        src="/logo.jpg" 
                        alt="GPS General Precision Spindles" 
                        style={{ width: '115px', height: 'auto', maxHeight: '54px', objectFit: 'contain', flexShrink: 0, marginTop: '2px' }} 
                      />
                      <div style={{ lineHeight: '1.25' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#000000', lineHeight: 1.15 }}>
                          GENERAL PRECISION<br />
                          SPINDLES
                        </div>
                        <div style={{ fontSize: '7.8px', color: '#000000', marginTop: '3px' }}>
                          SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI<br />
                          DHABA,NANDED PHATA SINHAGAD ROAD PUNE-411041 ,<br />
                          ☎+919764252188 /9764032929<br />
                          Email: process@gpsspindles.net<br />
                          GSTIN: 27AATFG1527D1ZF<br />
                          State: 27-Maharashtra
                        </div>
                      </div>
                    </div>

                    {/* Right: Metadata Grid (3 rows: Row 1 = Estimate No/Date, Row 2 = Place of supply/empty corner, Row 3 = empty bottom space) */}
                    <div style={{ borderLeft: '1px solid #b8b8b8', display: 'flex', flexDirection: 'column' }}>
                      {/* Row 1: Estimate No. & Date */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                        <div style={{ padding: '3.5px 6px' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>Estimate No.</div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {selectedQuote.estimateNo || selectedQuote.id || 'QTN/2026-27/294'}
                          </div>
                        </div>
                        <div style={{ padding: '3.5px 6px', borderLeft: '1px solid #b8b8b8' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>Date</div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {selectedQuote.date || '07-09-2026'}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Place of supply & empty right corner */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                        <div style={{ padding: '3.5px 6px' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>Place of supply</div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {selectedQuote.placeOfSupply || selectedQuote.state || '23-Madhya Pradesh'}
                          </div>
                        </div>
                        <div style={{ borderLeft: '1px solid #b8b8b8' }}></div>
                      </div>

                      {/* Row 3: Empty bottom column space */}
                      <div style={{ flex: 1, minHeight: '34px' }}></div>
                    </div>
                  </div>

                  {/* Estimate For (Customer Box) - matching Image 3 spacing */}
                  <div style={{ padding: '8px 12px 14px 12px', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                    <div style={{ fontSize: '7.8px', color: '#000000', marginBottom: '3px' }}>
                      Estimate For
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#000000', marginBottom: '4px' }}>
                      {selectedQuote.customer || 'LINAMAR INDIA PRIVATE LIMITED'}
                    </div>
                    <div style={{ fontSize: '8px', color: '#000000', lineHeight: '1.32', marginBottom: '16px' }}>
                      {selectedQuote.customerAddress ? (
                        selectedQuote.customerAddress.includes('\n') ? (
                          selectedQuote.customerAddress.split('\n').map((l, i) => <div key={i}>{l}</div>)
                        ) : selectedQuote.customerAddress.includes('Industrial Area-3') ? (
                          <>
                            <div>Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas</div>
                            <div>Dewas, Madhya Pradesh-455001</div>
                            <div>India</div>
                          </>
                        ) : (
                          <div>{selectedQuote.customerAddress}</div>
                        )
                      ) : (
                        <>
                          <div>Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas</div>
                          <div>Dewas, Madhya Pradesh-455001</div>
                          <div>India</div>
                        </>
                      )}
                    </div>
                    {/* Generous line spacing exactly as seen in reference Image 3 */}
                    <div style={{ fontSize: '8px', color: '#000000', marginBottom: '6px' }}>
                      Contact No. : {selectedQuote.contactNo || '7773877714'}
                    </div>
                    <div style={{ fontSize: '8px', color: '#000000', marginBottom: '6px' }}>
                      GSTIN : {selectedQuote.gstin || '23AACCL5351J1ZM'}
                    </div>
                    <div style={{ fontSize: '8px', color: '#000000' }}>
                      State: {selectedQuote.state || selectedQuote.placeOfSupply || '23-Madhya Pradesh'}
                    </div>
                  </div>

                  {/* Line Items Table */}
                  {(() => {
                    const calculatedSubtotal = (selectedQuote.items || []).reduce(
                      (sum, it) => sum + (Number(it.total != null ? it.total : (Number(it.qty || 0) * Number(it.unitPrice || 0))) || 0),
                      0
                    ) || selectedQuote.subtotal || 575000;

                    const calculatedTax = Math.round(calculatedSubtotal * ((Number(selectedQuote.taxRate) || 18) / 100));
                    const calculatedTotal = calculatedSubtotal + calculatedTax;
                    const totalQuantity = (selectedQuote.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);

                    // Dynamic HSN breakdown matching PDF format
                    const computeHsnBreakdown = (items) => {
                      const map = {};
                      (items || []).forEach(it => {
                        // Use '__blank__' as sentinel so blank-HSN items group separately
                        const rawCode = it.hsn != null ? String(it.hsn).trim() : '';
                        const key = rawCode === '' ? '__blank__' : rawCode;
                        const amt = Number(it.total != null ? it.total : (Number(it.qty || 0) * Number(it.unitPrice || 0))) || 0;
                        if (!map[key]) {
                          map[key] = { hsn: rawCode, taxable: 0, rate: '18%', igst: 0, totalTax: 0 };
                        }
                        map[key].taxable += amt;
                      });
                      return Object.values(map)
                        .sort((a, b) => {
                          if (!a.hsn && b.hsn) return -1;
                          if (a.hsn && !b.hsn) return 1;
                          return String(a.hsn).localeCompare(String(b.hsn));
                        })
                        .map(entry => {
                          const tax = Math.round(entry.taxable * 0.18);
                          return {
                            hsn: entry.hsn,
                            taxable: entry.taxable,
                            rate: '18%',
                            igst: tax,
                            totalTax: tax
                          };
                        });
                    };

                    const hsnBreakdown = (selectedQuote.hsnSummary && selectedQuote.hsnSummary.length > 0)
                      ? selectedQuote.hsnSummary
                      : computeHsnBreakdown(selectedQuote.items);

                    return (
                      <>
                        {/* Line Items Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #b8b8b8', fontSize: '8px', color: '#000000', flexShrink: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 5px', width: '28px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>#</th>
                              <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>Item name</th>
                              <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '95px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>HSN/ SAC</th>
                              <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '70px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Quantity</th>
                              <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '100px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Price/ Unit</th>
                              <th style={{ borderBottom: '1px solid #b8b8b8', padding: '3.5px 6px', width: '110px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedQuote.items || []).map((item, idx) => {
                              const itemTotal = Number(item.total != null ? item.total : (Number(item.qty || 0) * Number(item.unitPrice || 0))) || 0;
                              return (
                                <tr key={item.id || idx}>
                                  <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 5px', textAlign: 'left' }}>
                                    {idx + 1}
                                  </td>
                                  <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', fontWeight: 700 }}>
                                    {item.name || item.desc}
                                  </td>
                                  <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'left' }}>
                                    {item.hsn || ''}
                                  </td>
                                  <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                                    {item.qty}
                                  </td>
                                  <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                                     ₹ {Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td style={{ borderBottom: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                                     ₹ {itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Table Total Row directly follows the items without empty filler space */}
                            <tr style={{ fontWeight: 700 }}>
                              <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 5px' }}></td>
                              <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'left' }}>Total</td>
                              <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px' }}></td>
                              <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'right' }}>
                                {totalQuantity}
                              </td>
                              <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px' }}></td>
                              <td style={{ padding: '3.5px 6px', textAlign: 'right' }}>
                                ₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Middle Section: Words, Description & Amounts */}
                        <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                          {/* Left: Words + Description */}
                          <div>
                            {/* Estimate Amount in Words */}
                            <div style={{ padding: '5px 8px', borderBottom: '1px solid #b8b8b8' }}>
                              <div style={{ fontSize: '7.5px', color: '#000000' }}>Estimate Amount in Words</div>
                              <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#000000', marginTop: '2px' }}>
                                {selectedQuote.amountInWords || numberToIndianWords(calculatedTotal)}
                              </div>
                            </div>

                            {/* Description */}
                            <div style={{ padding: '6px 8px', fontSize: '7.8px', color: '#000000', lineHeight: '1.3' }}>
                              <div style={{ color: '#000000' }}>Description</div>
                              <div style={{ fontWeight: 700, marginTop: '2px' }}>
                                SERIAL NO. {selectedQuote.spindleSerial || 'HMMXXVI'}
                              </div>
                              <div style={{ fontWeight: 700 }}>
                                CHALLAN NO. {selectedQuote.challanNo || 'N/A'}
                              </div>
                              <div style={{ fontWeight: 700 }}>
                                INWORD DATE. {(() => {
                                  const raw = selectedQuote.inwardDate || '22-08-2026';
                                  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw;
                                  const d = new Date(raw);
                                  if (!isNaN(d.getTime())) {
                                    return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
                                  }
                                  return raw;
                                })()}
                              </div>
                              <div style={{ fontWeight: 700, marginTop: '2px' }}>
                                SCOPE OF WORK :-
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px', fontSize: '7.4px', lineHeight: '1.5', fontWeight: 700 }}>
                                {(() => {
                                  const rawScope = Array.isArray(selectedQuote.scopeOfWork)
                                    ? selectedQuote.scopeOfWork
                                    : (selectedQuote.scopeOfWork || '1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. HSK -63 SHAFT SLEEVING\n6. MFG OF DRAWBAR LOCKNUT\n7. MFG OF TOOL CLAMP DICLAMP PLATE .\n8. STATOR INSPECTION.\n9. STATIC TEST.\n10. ASSEMBLY\n11. DYANAMIC TEST.').split('\n');
                                  return rawScope.map((line, idx) => (
                                    <div key={idx}>{line.trim()}</div>
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Right: Amounts */}
                          <div style={{ borderLeft: '1px solid #b8b8b8', padding: '6px 10px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '8px', color: '#000000', marginBottom: '4px', fontWeight: 700 }}>Amounts</div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3.5px 0' }}>
                              <span>Sub Total</span>
                              <span>₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3.5px 0' }}>
                              <span>Tax ({selectedQuote.taxRate || 18}%)</span>
                              <span>₹ {calculatedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>

                            <div style={{ borderTop: '1px solid #b8b8b8', margin: '4px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.8px', fontWeight: 700, padding: '3px 0' }}>
                              <span>Total</span>
                              <span>₹ {calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>

                        {/* HSN/SAC Tax Summary Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #b8b8b8', fontSize: '7.8px', color: '#000000', flexShrink: 0 }}>
                          <thead>
                            <tr>
                              <th rowSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, background: '#ffffff', width: '22%' }}>HSN/ SAC</th>
                              <th rowSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, background: '#ffffff', width: '24%' }}>Taxable amount</th>
                              <th colSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '30%' }}>IGST</th>
                              <th rowSpan="2" style={{ borderBottom: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, background: '#ffffff', width: '24%' }}>Total Tax Amount</th>
                            </tr>
                            <tr>
                              <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '14%' }}>Rate</th>
                              <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2px 6px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '16%' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hsnBreakdown.map((row, idx) => (
                              <tr key={idx}>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'left' }}>
                                  {row.hsn || ''}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                  ₹ {Number(row.taxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                  {row.rate || '18%'}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                  ₹ {Number(row.igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                  ₹ {Number(row.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                            {/* HSN Table Total */}
                            <tr style={{ fontWeight: 700 }}>
                              <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>Total</td>
                              <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                                ₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}></td>
                              <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                                ₹ {calculatedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                                ₹ {calculatedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Bottom: Bank Details, Terms, and Signatory (3 Columns matching Image 2) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '29% 41% 30%', fontSize: '7.2px', color: '#000000', flex: 1, minHeight: 0 }}>
                          {/* Col 1: Bank Details */}
                          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontWeight: 700, fontSize: '8.5px', marginBottom: '6px' }}>Bank Details</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              {/* Dynamic Amount-Wise UPI QR Code */}
                              <UpiQrCode 
                                amount={calculatedTotal}
                                quoteNo={selectedQuote.estimateNo || selectedQuote.id}
                                upiId={selectedQuote.bankDetails?.upiId || selectedQuote.upiId || getActiveUpiId()}
                                payeeName={selectedQuote.bankDetails?.accountHolder || 'GENERAL PRECISION SPINDLES'}
                                size={48}
                                onNotify={onNotify}
                              />

                              {/* Bank Details Text - each field on its own line with proper gap like original PDF */}
                              <div style={{ fontSize: '7.4px', lineHeight: '1.45' }}>
                                <div style={{ marginBottom: '4px' }}>Name : ICICI BANK LIMITED, PUNE<br />NANDED CITY</div>
                                <div style={{ marginBottom: '4px' }}>Account No. : 349105000701</div>
                                <div style={{ marginBottom: '4px' }}>IFSC code : ICIC0003491</div>
                                <div style={{ marginBottom: '4px' }}>
                                  UPI ID : <span className="mono" style={{ color: '#7A1F3D', fontWeight: 600 }}>{selectedQuote.bankDetails?.upiId || selectedQuote.upiId || getActiveUpiId()}</span>
                                  {(selectedQuote.bankDetails?.upiId || selectedQuote.upiId || getActiveUpiId()).includes('349105000701') && (
                                    <span style={{ marginLeft: '4px', background: '#fef3c7', color: '#b45309', padding: '1px 3px', borderRadius: '2px', fontSize: '6px', fontWeight: 700 }}>
                                      Tap QR to link real ID
                                    </span>
                                  )}
                                </div>
                                <div>Account holder's name : GENERAL<br />PRECISION SPINDLES</div>
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Terms and conditions */}
                          <div style={{ borderLeft: '1px solid #b8b8b8', padding: '8px 10px' }}>
                            <div style={{ fontWeight: 700, fontSize: '8.5px', marginBottom: '6px' }}>Terms and conditions</div>
                            <div style={{ fontSize: '7px', lineHeight: '1.5', color: '#000000' }}>
                              <div style={{ marginBottom: '6px' }}>
                                We declare that this invoice shows the actual price of the goods<br />
                                described and that all particulars are true and correct.
                              </div>
                              <div style={{ fontWeight: 700, marginBottom: '2px' }}>Bank Details:</div>
                              <div style={{ marginBottom: '1px' }}>ICICI Bank Ltd(Nanded City Branch)</div>
                              <div style={{ marginBottom: '1px' }}>A/c No : 349105000701</div>
                              <div style={{ marginBottom: '1px' }}>IFSC Code : ICIC0003491</div>
                              <div style={{ marginBottom: '4px' }}>MSME (UDYAM ADHAR) NO-MH26A0189736</div>
                              <div style={{ marginBottom: '1px' }}>TYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING</div>
                              <div>MAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC, VMC, HMC, BELT DRIVEN, DIRECT DRIVEN, INTEGRATED, SPINDLE REPAIRING, SPINDLE MANUFACTURING.</div>
                            </div>
                          </div>

                          {/* Col 3: Signatory */}
                          <div style={{ borderLeft: '1px solid #b8b8b8', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', boxSizing: 'border-box' }}>
                            <div style={{ fontSize: '8px', fontWeight: 400, textAlign: 'center' }}>
                              For : GENERAL PRECISION SPINDLES
                            </div>
                            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '8.5px', paddingBottom: '8px' }}>
                              Authorized Signatory
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {!selectedQuote && (
        <div className="section-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FileText size={48} style={{ opacity: 0.25, marginBottom: '16px', color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>No Quotation Selected</h3>
          <p style={{ fontSize: '13px', maxWidth: '360px', margin: '0 auto 16px', lineHeight: '1.5' }}>
            There are currently no active quotations loaded. Generate an official GPS proposal using the button below.
          </p>
          <button 
            type="button" 
            className="btn btn-primary btn-sm" 
            onClick={() => setIsNewQuoteOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            <span>Create New Quotation</span>
          </button>
        </div>
      )}
      </div>

      {/* NEW QUOTATION MODAL - COMPACT & MATCHING THE PDF INVOICE FIELDS EXACTLY */}
      <Modal
        isOpen={isNewQuoteOpen}
        onClose={() => setIsNewQuoteOpen(false)}
        title="Create New Precision Spindle Estimate / Quotation (Official GPS Format)"
        maxWidth="920px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleResetToLinamar}
              title="Reset fields to the Linamar Kesslar PDF estimate sample"
            >
              <RefreshCw size={12} />
              <span>Load Linamar Kesslar PDF Template</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => setIsNewQuoteOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={handleCreateQuotation}
              >
                <CheckCircle size={13} />
                <span>Generate Quotation</span>
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateQuotation} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* SECTION 1: Estimate & Place of Supply */}
          <div style={{ padding: '8px 10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Hash size={12} color="#7A1F3D" />
              <span>Estimate Number & Supply Jurisdiction</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Estimate / Quotation No.</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formState.estimateNo}
                  onChange={(e) => setFormState({ ...formState, estimateNo: e.target.value })}
                  placeholder="e.g. QTN/2026-27/294"
                  style={{ height: '28px', fontSize: '11px' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Estimate Date</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formState.date}
                  onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                  placeholder="DD-MM-YYYY"
                  style={{ height: '28px', fontSize: '11px' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Place of Supply (State / Code)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formState.placeOfSupply}
                  onChange={(e) => setFormState({ ...formState, placeOfSupply: e.target.value })}
                  placeholder="e.g. 23-Madhya Pradesh"
                  style={{ height: '28px', fontSize: '11px' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Initial Status</label>
                <select 
                  className="form-control" 
                  value={formState.status || 'Draft'}
                  onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                  style={{ height: '28px', fontSize: '11px', fontWeight: 600 }}
                >
                  <option value="Draft">Draft</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Estimate For (Customer / Buyer Details) */}
          <div style={{ padding: '8px 10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Building2 size={12} color="#7A1F3D" />
              <span>Estimate For (Customer / Buyer Details)</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '10px' }}>Customer Legal Entity Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formState.customer}
                  onChange={(e) => setFormState({ ...formState, customer: e.target.value })}
                  placeholder="e.g. LINAMAR INDIA PRIVATE LIMITED"
                  style={{ height: '28px', fontSize: '11px' }}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '10px' }}>Factory / Plant Physical Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formState.customerAddress}
                  onChange={(e) => setFormState({ ...formState, customerAddress: e.target.value })}
                  placeholder="Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas..."
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Contact No.</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formState.contactNo}
                  onChange={(e) => setFormState({ ...formState, contactNo: e.target.value })}
                  placeholder="e.g. 7773877714"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Customer GSTIN</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formState.gstin}
                  onChange={(e) => setFormState({ ...formState, gstin: e.target.value })}
                  placeholder="e.g. 23AACCL5351J1ZM"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Customer State</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formState.state}
                  onChange={(e) => setFormState({ ...formState, state: e.target.value })}
                  placeholder="e.g. 23-Madhya Pradesh"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Spindle Description & Scope of Work */}
          <div style={{ padding: '8px 10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileCheck size={12} color="#7A1F3D" />
              <span>Job Identification & Scope of Work</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Serial No.</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formState.spindleSerial}
                  onChange={(e) => setFormState({ ...formState, spindleSerial: e.target.value })}
                  placeholder="e.g. HMMXXVI or GPS-2026-XXXX"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Challan No.</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formState.challanNo}
                  onChange={(e) => setFormState({ ...formState, challanNo: e.target.value })}
                  placeholder="e.g. N/A or CH-2026-881"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Inward Date</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formState.inwardDate}
                  onChange={(e) => setFormState({ ...formState, inwardDate: e.target.value })}
                  placeholder="e.g. 22-08-2026"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '10px' }}>Scope of Work (Operations Protocol)</label>
              <textarea 
                className="form-control" 
                rows="3"
                value={formState.scopeOfWork}
                onChange={(e) => setFormState({ ...formState, scopeOfWork: e.target.value })}
                placeholder="1. DISMANTLE&#10;2. CLEANING&#10;3. INSPECTION..."
                style={{ fontSize: '10.5px', fontFamily: 'monospace', lineHeight: '1.35' }}
              />
            </div>
          </div>

          {/* SECTION 4: Line Items Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <DollarSign size={12} color="#7A1F3D" />
                <span>Line Items (# Item name, HSN/SAC, Quantity, Price/Unit, Amount)</span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleAddItem}
                style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
              >
                <Plus size={12} />
                <span>Add Item</span>
              </button>
            </div>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
              <table className="data-table" style={{ margin: 0, fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '26px', textAlign: 'left', padding: '4px' }}>#</th>
                    <th style={{ padding: '4px 6px' }}>Item name / Description</th>
                    <th style={{ width: '90px', padding: '4px 6px' }}>HSN/ SAC</th>
                    <th style={{ width: '60px', textAlign: 'right', padding: '4px 6px' }}>Qty</th>
                    <th style={{ width: '110px', textAlign: 'right', padding: '4px 6px' }}>Price/ Unit (₹)</th>
                    <th style={{ width: '110px', textAlign: 'right', padding: '4px 6px' }}>Amount (₹)</th>
                    <th style={{ width: '32px', textAlign: 'center', padding: '4px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formState.items.map((item, idx) => {
                    const rowAmount = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'left', fontSize: '10px', color: 'var(--text-muted)', padding: '3px' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '3px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            placeholder="e.g. SHAFT SLEEVING"
                            style={{ height: '26px', fontSize: '11px' }}
                            required
                          />
                        </td>
                        <td style={{ padding: '3px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control mono"
                            value={item.hsn}
                            onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                            placeholder="84669390"
                            style={{ height: '26px', fontSize: '10.5px' }}
                          />
                        </td>
                        <td style={{ padding: '3px 4px' }}>
                          <input 
                            type="number" 
                            className="form-control mono"
                            value={item.qty}
                            onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                            min="1"
                            style={{ height: '26px', fontSize: '11px', textAlign: 'right' }}
                            required
                          />
                        </td>
                        <td style={{ padding: '3px 4px' }}>
                          <input 
                            type="number" 
                            className="form-control mono"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                            min="0"
                            style={{ height: '26px', fontSize: '11px', textAlign: 'right' }}
                            required
                          />
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontSize: '11px', padding: '3px 6px' }}>
                          ₹{rowAmount.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'center', padding: '3px' }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRemoveItem(item.id)}
                            style={{ padding: '2px 4px', color: '#dc2626' }}
                            title="Remove line item"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 5: Commercial Totals, GST Breakdown & Amount in Words */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', padding: '8px 10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Estimate Amount in Words
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', fontStyle: 'italic', lineHeight: '1.3' }}>
                "{formCalculations.amountInWords}"
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Bank: <strong>ICICI BANK LIMITED, PUNE NANDED CITY</strong><br/>
                A/C: <strong className="mono">349105000701</strong> • IFSC: <strong className="mono">ICIC0003491</strong> • UPI: <strong className="mono">{getActiveUpiId()}</strong> • MSME: <strong className="mono">MH26A0189736</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Total Items Quantity:</span>
                <span className="mono" style={{ fontWeight: 600 }}>{formCalculations.totalQty} Units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Sub Total Amount:</span>
                <span className="mono" style={{ fontWeight: 600 }}>₹{formCalculations.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                <span>Tax (18% IGST):</span>
                <span className="mono" style={{ fontWeight: 600 }}>₹{formCalculations.taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, borderTop: '2px solid var(--border-color)', paddingTop: '4px', color: 'var(--primary)' }}>
                <span>Total Estimated:</span>
                <span className="mono">₹{formCalculations.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

        </form>
      </Modal>

      {/* Outlook-Style Email Composer */}
      {isEmailComposerOpen && (
        <OutlookEmailComposer 
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          documentData={emailDoc || selectedQuote}
          documentType="quotation"
          onSent={handleEmailSent}
          onSaveDraft={handleEmailSaveDraft}
          onNotify={onNotify}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!quoteToDelete}
        onClose={() => !isDeleting && setQuoteToDelete(null)}
        title="Delete Quotation / Invoice"
        maxWidth="460px"
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setQuoteToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleExecuteDelete}
              disabled={isDeleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                fontWeight: 600,
                cursor: isDeleting ? 'not-allowed' : 'pointer'
              }}
            >
              {isDeleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
              <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
            </button>
          </div>
        )}
      >
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: '#fee2e2', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0 
            }}>
              <AlertCircle size={22} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                Are you sure you want to delete this invoice / quotation?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                This will permanently remove quotation <strong className="mono" style={{ color: 'var(--text-main)' }}>{quoteToDelete?.estimateNo || quoteToDelete?.id}</strong> for <strong style={{ color: 'var(--text-main)' }}>{quoteToDelete?.customer}</strong>.
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface-subtle)',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Amount:</span>
              <strong className="mono" style={{ color: 'var(--text-main)' }}>₹{quoteToDelete?.totalAmount?.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Status:</span>
              <StatusBadge status={quoteToDelete?.status} size="sm" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Issue Date:</span>
              <span>{quoteToDelete?.date}</span>
            </div>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
