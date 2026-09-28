import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import Tabs from '../components/common/Tabs';
import CustomSelect from '../components/common/CustomSelect';
import { salesService } from '../services/database/salesService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportQuotationPdf, exportElementAsPdf } from '../utils/pdfGenerator';
import { 
  Search, Plus, Eye, Printer, CheckCircle, FileText, 
  Send, DollarSign, ArrowRight, Download, Trash2, Edit3, 
  Check, RefreshCw, X, FileCheck, Building2, User, Phone, 
  MapPin, Hash, Maximize2, Minimize2, ChevronRight, Mail, AlertCircle
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import EmailActivityTable from '../components/email/EmailActivityTable';
import { INITIAL_EMAIL_ACTIVITY, fetchEmailActivityLive } from '../services/emailService';

// Indian numbering format numbers to words converter
export function numberToIndianWords(num) {
  if (!num || isNaN(num) || num === 0) return 'Zero Rupees only';
  
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  let n = Math.floor(Math.abs(num));
  let crore = Math.floor(n / 10000000);
  n %= 10000000;
  let lakh = Math.floor(n / 100000);
  n %= 100000;
  let thousand = Math.floor(n / 1000);
  n %= 1000;
  let hundred = Math.floor(n / 100);
  let rem = n % 100;

  let res = [];
  if (crore > 0) res.push(`${inWords(crore)} Crore`);
  if (lakh > 0) res.push(`${inWords(lakh)} Lakh`);
  if (thousand > 0) res.push(`${inWords(thousand)} Thousand`);
  if (hundred > 0) res.push(`${inWords(hundred)} Hundred`);
  if (rem > 0) res.push(inWords(rem));

  return res.join(' ') + ' Rupees only';
}

const DEFAULT_LINAMAR_TEMPLATE = {
  estimateNo: 'QTN/2026-27/294',
  date: '07-09-2026',
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

export default function SalesScreen({ onNavigate, onNotify, initialTab = 'quotations' }) {
  const [quotations, setQuotations] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [isDocExpanded, setIsDocExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  const loadQuotations = async () => {
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
      if (prev) {
        const match = data.find(q => q.id === prev.id);
        if (match) return match;
      }
      return data[0] || null;
    });
    setIsLoading(false);
  };

  const [emailActivity, setEmailActivity] = useState([]);

  const loadEmails = async () => {
    try {
      const res = await fetchEmailActivityLive();
      if (res.data) {
        setEmailActivity(res.data);
      }
    } catch (e) {
      console.error('Failed to load live email activity:', e);
    }
  };

  useEffect(() => {
    loadQuotations();
    loadEmails();
  }, []);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Email state
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [emailDoc, setEmailDoc] = useState(null);

  const handleOpenEmailForQuote = (quote) => {
    setEmailDoc(quote);
    setIsEmailComposerOpen(true);
  };

  const handleOpenDraftInComposer = (draftRecord) => {
    const foundQuote = quotations.find(q => q.id === draftRecord.documentId);
    setEmailDoc(foundQuote || {
      id: draftRecord.documentId,
      customer: draftRecord.customer,
      amount: 842000,
      spindleModel: draftRecord.subject.replace(/Quotation.*?—\s*/, '')
    });
    setIsEmailComposerOpen(true);
  };

  const handleEmailSent = (record) => {
    loadEmails();
  };

  const handleEmailSaveDraft = (draftRecord) => {
    loadEmails();
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

  const filteredQuotes = quotations.filter((q) => {
    const matchesStatus = statusFilter === 'all' || q.status.toLowerCase() === statusFilter.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      q.id.toLowerCase().includes(query) ||
      q.customer.toLowerCase().includes(query) ||
      (q.spindleSerial && q.spindleSerial.toLowerCase().includes(query)) ||
      (q.contactPerson && q.contactPerson.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const handleApproveQuote = async (quoteId) => {
    const res = await salesService.updateQuotationStatus(quoteId, 'Approved');
    if (res.error) {
      onNotify(res.error.message || 'Failed to approve quotation.', 'error');
      return;
    }
    onNotify(`Quotation ${quoteId} marked as Approved. Ready for Work Order creation.`);
    await loadQuotations();
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

    const qNo = formState.estimateNo || `QTN/2026-27/${Math.floor(290 + Math.random() * 50)}`;
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
      status: 'Sent',
      terms: formState.terms,
      items: formState.items
    });

    if (res.error) {
      onNotify(res.error.message || 'Failed to create quotation in database.', 'error');
      return;
    }

    setIsNewQuoteOpen(false);
    onNotify(`Estimate ${qNo} created successfully for ${formState.customer}`);
    await loadQuotations();
  };

  const handlePrint = async () => {
    if (!selectedQuote) return;
    try {
      const element = document.getElementById('printable-quotation');
      let success = false;
      const cleanId = String(selectedQuote.estimateNo || selectedQuote.id || 'QTN').replace(/[^a-zA-Z0-9_-]/g, '_');
      if (element) {
        success = await exportElementAsPdf(element, `GPS_Estimate_${cleanId}.pdf`);
      }
      if (!success) {
        exportQuotationPdf(selectedQuote);
      }
      if (onNotify) onNotify(`Quotation Estimate ${selectedQuote.estimateNo || selectedQuote.id} downloaded (PDF)`);
    } catch (err) {
      console.error('Failed to export quotation PDF:', err);
      exportQuotationPdf(selectedQuote);
      if (onNotify) onNotify(`Quotation Estimate ${selectedQuote.estimateNo || selectedQuote.id} downloaded (PDF)`);
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
          onClick={() => setIsNewQuoteOpen(true)}
        >
          <Plus size={14} />
          <span>New Quotation</span>
        </button>
      </PageHeader>

      {/* Top Level Tabs: Quotations vs Email Activity */}
      <Tabs 
        tabs={[
          { id: 'quotations', label: 'Commercial Quotations & Proposals', count: filteredQuotes.length },
          { id: 'activity', label: 'Email Activity & Logs', count: emailActivity.length }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Quotations Master-Detail View */}
      {activeTab === 'quotations' && (
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
                style={{ width: '150px' }}
              >
                <option value="all">All Statuses ({quotations.length})</option>
                <option value="under review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="draft">Draft</option>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        {selectedQuote && (
          <div className="section-card" style={{ padding: '0', overflow: 'hidden', minWidth: 0 }}>
            {/* Top Action Header */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: '14px' }}>{selectedQuote.id}</span>
                <StatusBadge status={selectedQuote.status} size="sm" />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {selectedQuote.customer}</span>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrint}
                  title="Print official Estimate / Invoice"
                  style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                >
                  <Printer size={12} />
                  <span>Print PDF</span>
                </button>

                {selectedQuote.status !== 'Approved' && (
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApproveQuote(selectedQuote.id)}
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                  >
                    <CheckCircle size={12} />
                    <span>Approve</span>
                  </button>
                )}

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
                  onClick={() => onNotify(`Quotation ${selectedQuote.id} converted into Production Work Order`)}
                  title="Convert to Shop Floor Work Order"
                  style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                >
                  <ArrowRight size={12} />
                  <span>Create WO</span>
                </button>
              </div>
            </div>

            {/* Document Body (Matching Estimate_QTN 2026-27 294 PDF) */}
            <div id="printable-quotation" style={{ padding: '14px 16px', background: '#ffffff', color: '#0f172a', fontSize: '11px', lineHeight: '1.35' }}>
              
              {/* Document Title Banner */}
              <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '15px', letterSpacing: '0.04em', borderBottom: '2px solid #0f172a', paddingBottom: '3px', marginBottom: '8px' }}>
                Estimate
              </div>

              {/* Company Header & Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', border: '1px solid #cbd5e1', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                {/* Seller Brand & Address */}
                <div style={{ padding: '8px 10px', borderRight: '1px solid #cbd5e1', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '2px', height: '42px', width: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src="/logo.jpg" alt="General Precision Spindles" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '0.02em', color: '#0f172a' }}>
                      GENERAL PRECISION SPINDLES
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#475569' }}>
                      SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#475569' }}>
                      ☎ +919764252188 / 9764032929 • Email: process@gpsspindles.net
                    </div>
                    <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#0f172a' }}>
                      GSTIN: 27AATFG1527D1ZF • State: 27-Maharashtra
                    </div>
                  </div>
                </div>

                {/* Estimate Meta Fields */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #cbd5e1' }}>
                    <div style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '8.5px', color: '#64748b', textTransform: 'uppercase' }}>Estimate No.</div>
                      <div className="mono" style={{ fontWeight: 800, fontSize: '11px' }}>
                        {selectedQuote.estimateNo || selectedQuote.id}
                      </div>
                    </div>
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: '8.5px', color: '#64748b', textTransform: 'uppercase' }}>Date</div>
                      <div className="mono" style={{ fontWeight: 700, fontSize: '11px' }}>
                        {selectedQuote.date}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: '8.5px', color: '#64748b', textTransform: 'uppercase' }}>Place of supply</div>
                    <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--primary)' }}>
                      {selectedQuote.placeOfSupply || selectedQuote.state || '23-Madhya Pradesh'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Estimate For (Customer Box) */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '3px', padding: '8px 10px', marginBottom: '8px', background: '#f8fafc' }}>
                <div style={{ fontSize: '8.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Estimate For</div>
                <div style={{ fontWeight: 800, fontSize: '12.5px', color: '#0f172a', marginTop: '1px' }}>
                  {selectedQuote.customer}
                </div>
                <div style={{ fontSize: '9.5px', color: '#334155', marginTop: '1px' }}>
                  {selectedQuote.customerAddress || 'Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas, Dewas, Madhya Pradesh-455001 India'}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '9.5px', marginTop: '3px', flexWrap: 'wrap' }}>
                  <span>Contact No. : <strong>{selectedQuote.contactNo || '7773877714'}</strong></span>
                  <span>GSTIN : <strong className="mono">{selectedQuote.gstin || '23AACCL5351J1ZM'}</strong></span>
                  <span>State: <strong>{selectedQuote.state || selectedQuote.placeOfSupply || '23-Madhya Pradesh'}</strong></span>
                </div>
              </div>

              {/* Line Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', marginBottom: '6px', fontSize: '9.5px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px 3px', width: '24px', textAlign: 'center' }}>#</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'left' }}>Item name</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px 3px', width: '70px', textAlign: 'center' }}>HSN/ SAC</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px 3px', width: '40px', textAlign: 'center' }}>Qty</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', width: '85px', textAlign: 'right' }}>Price/ Unit</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px 6px', width: '90px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedQuote.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 3px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '4px 6px', fontWeight: 600 }}>{item.name || item.desc}</td>
                      <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '4px 3px', textAlign: 'center', color: '#475569' }}>{item.hsn || '—'}</td>
                      <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '4px 3px', textAlign: 'center' }}>{item.qty}</td>
                      <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>₹ {item.unitPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>₹ {(item.total || (item.qty * item.unitPrice))?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan="3" style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>Total</td>
                    <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '4px 3px', textAlign: 'center' }}>
                      {(selectedQuote.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0)}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1' }}></td>
                    <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '4px 6px', textAlign: 'right' }}>
                      ₹ {selectedQuote.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Estimate Amount in Words */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '3px', padding: '5px 8px', background: '#f8fafc', marginBottom: '8px' }}>
                <div style={{ fontSize: '8.5px', color: '#64748b', textTransform: 'uppercase' }}>Estimate Amount in Words</div>
                <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#0f172a', fontStyle: 'italic' }}>
                  {selectedQuote.amountInWords || numberToIndianWords(selectedQuote.totalAmount)}
                </div>
              </div>

              {/* Grid: Description / Scope of Work & Amounts Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {/* Description & Scope of Work */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '3px', padding: '6px 8px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                    Description
                  </div>
                  <div style={{ fontSize: '9px', display: 'flex', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span>SERIAL NO: <strong className="mono">{selectedQuote.spindleSerial || 'HMMXXVI'}</strong></span>
                    <span>CHALLAN NO: <strong className="mono">{selectedQuote.challanNo || 'N/A'}</strong></span>
                    <span>INWORD DATE: <strong className="mono">{selectedQuote.inwardDate || selectedQuote.date}</strong></span>
                  </div>
                  <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#334155' }}>SCOPE OF WORK :-</div>
                  <div style={{ fontSize: '8.5px', color: '#475569', lineHeight: '1.25', marginTop: '1px', whiteSpace: 'pre-line' }}>
                    {Array.isArray(selectedQuote.scopeOfWork) ? selectedQuote.scopeOfWork.join('\n') : (selectedQuote.scopeOfWork || '1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. HSK -63 SHAFT SLEEVING\n6. MFG OF DRAWBAR LOCKNUT\n7. MFG OF TOOL CLAMP DICLAMP PLATE .\n8. STATOR INSPECTION.\n9. STATIC TEST.\n10. ASSEMBLY\n11. DYANAMIC TEST.')}
                  </div>
                </div>

                {/* Amounts Breakdown */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '3px', padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '4px' }}>
                    Amounts
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '9.5px' }}>
                    <span>Sub Total</span>
                    <span className="mono" style={{ fontWeight: 600 }}>₹ {selectedQuote.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '9.5px', color: '#475569' }}>
                    <span>Tax (18% IGST)</span>
                    <span className="mono" style={{ fontWeight: 600 }}>₹ {selectedQuote.gstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '11px', fontWeight: 800, borderTop: '2px solid #0f172a', color: 'var(--primary)' }}>
                    <span>Total</span>
                    <span className="mono">₹ {selectedQuote.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* HSN/SAC Tax Summary Table */}
              <div style={{ marginBottom: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '8.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                      <th rowSpan="2" style={{ border: '1px solid #cbd5e1', padding: '3px' }}>HSN/ SAC</th>
                      <th rowSpan="2" style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'right' }}>Taxable amount</th>
                      <th colSpan="2" style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'center' }}>IGST</th>
                      <th rowSpan="2" style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'right' }}>Total Tax Amount</th>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ border: '1px solid #cbd5e1', padding: '2px', textAlign: 'center' }}>Rate</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '2px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuote.hsnSummary ? (
                      selectedQuote.hsnSummary.map((h, i) => (
                        <tr key={i}>
                          <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'center' }}>{h.hsn}</td>
                          <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'right' }}>₹ {h.taxable?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'center' }}>{h.rate}</td>
                          <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'right' }}>₹ {h.igst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'right' }}>₹ {h.totalTax?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'center' }}>84669390</td>
                        <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'right' }}>₹ {selectedQuote.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'center' }}>18%</td>
                        <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'right' }}>₹ {selectedQuote.gstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '2px 4px', textAlign: 'right' }}>₹ {selectedQuote.gstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '3px', textAlign: 'center' }}>Total</td>
                      <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '3px 4px', textAlign: 'right' }}>₹ {selectedQuote.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ border: '1px solid #cbd5e1' }}></td>
                      <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '3px 4px', textAlign: 'right' }}>₹ {selectedQuote.gstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="mono" style={{ border: '1px solid #cbd5e1', padding: '3px 4px', textAlign: 'right' }}>₹ {selectedQuote.gstAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom: Bank Details, Terms, and Signatory */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 1fr', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '6px 8px', gap: '8px', fontSize: '8.5px' }}>
                {/* Bank Details */}
                <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '6px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '1px' }}>Bank Details</div>
                  <div style={{ color: '#475569', lineHeight: '1.25' }}>
                    Name : ICICI BANK LIMITED, PUNE NANDED CITY<br/>
                    Account No. : <strong className="mono">349105000701</strong><br/>
                    IFSC code : <strong className="mono">ICIC0003491</strong><br/>
                    Account holder's name : <strong>GENERAL PRECISION SPINDLES</strong>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '6px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '1px' }}>Terms and conditions</div>
                  <div style={{ color: '#475569', lineHeight: '1.2', fontSize: '8px' }}>
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.<br/>
                    <strong>MSME (UDYAM ADHAR) NO-MH26A0189736</strong><br/>
                    TYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING<br/>
                    MAJOR ACTIVITIES: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,INTEGRATED,SPINDLE REPAIRING ,SPINDLE MANUFACTURING.
                  </div>
                </div>

                {/* Authorized Signatory */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2px' }}>
                  <div style={{ fontWeight: 700, fontSize: '8.5px' }}>For : GENERAL PRECISION SPINDLES</div>
                  <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '2px', marginTop: '22px', fontWeight: 700, color: '#334155' }}>
                    Authorized Signatory
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
      )}

      {/* Email Activity History Tab */}
      {activeTab === 'activity' && (
        <EmailActivityTable 
          emailList={emailActivity}
          onOpenComposerForDraft={handleOpenDraftInComposer}
          onNotify={onNotify}
        />
      )}

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
                    <th style={{ width: '26px', textAlign: 'center', padding: '4px' }}>#</th>
                    <th style={{ padding: '4px 6px' }}>Item name / Description</th>
                    <th style={{ width: '90px', padding: '4px 6px' }}>HSN/ SAC</th>
                    <th style={{ width: '60px', textAlign: 'center', padding: '4px 6px' }}>Qty</th>
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
                        <td style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', padding: '3px' }}>
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
                            style={{ height: '26px', fontSize: '11px', textAlign: 'center' }}
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
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 600, fontSize: '11px', padding: '3px 6px' }}>
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
                A/C: <strong className="mono">349105000701</strong> • IFSC: <strong className="mono">ICIC0003491</strong> • MSME: <strong className="mono">MH26A0189736</strong>
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
    </div>
  );
}
