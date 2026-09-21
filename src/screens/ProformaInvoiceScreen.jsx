import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { proformaInvoiceService } from '../services/database/proformaInvoiceService';
import { 
  Search, Plus, Eye, Printer, FileText, Send, 
  Download, Trash2, Edit3, Check, X, Building2, 
  User, Phone, MapPin, Mail, Clock, ShoppingCart, 
  CheckCircle2, AlertCircle, Calendar, DollarSign,
  ChevronRight, ArrowRight, ShieldCheck, Link2, RefreshCw
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';

const PRESET_CUSTOMERS = [
  {
    name: 'Tata Advanced Systems',
    fullName: 'Tata Advanced Systems Ltd',
    contact: 'Mr. Tanmay Sharma (DGM - Procurement)',
    email: 'tanmay@tataadvanced.com',
    billingAddress: 'Aerospace Special Economic Zone, Hardware Park, Adibatla, Hyderabad, Telangana - 501510',
    shippingAddress: 'Tata Advanced Systems Tooling Bay, Chakan MIDC Phase II, Pune - 410501, Maharashtra',
    gstin: '36AAACT2718E1ZQ',
    defaultSO: 'SO-2026-041'
  },
  {
    name: 'Bharat Forge',
    fullName: 'Bharat Forge Ltd',
    contact: 'Mr. Sunil Kadam (DGM - Maintenance & Tooling)',
    email: 'procurement@bharatforge.com',
    billingAddress: 'Mundhwa, Pune Cantonment, Pune - 411036, Maharashtra, India',
    shippingAddress: 'Heavy Forging Division Bay 4, Bharat Forge Works, Mundhwa, Pune - 411036',
    gstin: '27AAACB1829D1Z2',
    defaultSO: 'SO-2026-045'
  },
  {
    name: 'Godrej Aerospace',
    fullName: 'Godrej & Boyce Aerospace Division',
    contact: 'Ms. Anita Saxena (Lead - Aerospace Tooling)',
    email: 'maintenance@godrejaerospace.com',
    billingAddress: 'Plant 14, Pirojshanagar, Vikhroli East, Mumbai - 400079, Maharashtra',
    shippingAddress: 'Aerospace Clean Assembly Shop, Vikhroli, Mumbai - 400079',
    gstin: '27AAACG0821M1Z5',
    defaultSO: 'SO-2026-048'
  },
  {
    name: 'Mahindra Heavy Engines',
    fullName: 'Mahindra Heavy Engines Ltd',
    contact: 'Mr. Praveen Shinde (Plant Maintenance)',
    email: 'projects@mahindra.com',
    billingAddress: 'Chakan Industrial Area, Phase II, Pune - 410501, Maharashtra',
    shippingAddress: 'Engine Line 3, Mahindra Chakan Plant, Pune - 410501',
    gstin: '27AAACM8890K1ZV',
    defaultSO: 'SO-2026-052'
  }
];

export default function ProformaInvoiceScreen({ onNavigate, onNotify }) {
  const [proformaInvoices, setProformaInvoices] = useState([]);
  const [selectedPI, setSelectedPI] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadPIs = async () => {
    setIsLoading(true);
    setError(null);
    const res = await proformaInvoiceService.getProformaInvoices();
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    }
    const data = res.data || [];
    setProformaInvoices(data);
    setSelectedPI(prev => {
      if (prev) {
        const match = data.find(p => p.id === prev.id);
        if (match) return match;
      }
      return data[0] || null;
    });
    setIsLoading(false);
  };

  useEffect(() => {
    loadPIs();
  }, []);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPIId, setEditingPIId] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Email and Document Preview
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [piForEmail, setPiForEmail] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form State for Create / Edit PI
  const [formData, setFormData] = useState({
    customer: 'Tata Advanced Systems',
    customerEmail: 'tanmay@tataadvanced.com',
    customerContact: 'Mr. Tanmay Sharma (DGM - Procurement)',
    billingAddress: 'Aerospace Special Economic Zone, Hardware Park, Adibatla, Hyderabad, Telangana - 501510',
    shippingAddress: 'Tata Advanced Systems Tooling Bay, Chakan MIDC Phase II, Pune - 410501, Maharashtra',
    gstin: '36AAACT2718E1ZQ',
    salesOrder: 'SO-2026-041',
    piDate: '09 Sep 2026',
    validUntil: '24 Sep 2026',
    paymentTerms: '50% Advance with Proforma, 50% against Dispatch Inspection',
    notes: 'Proforma generated against confirmed Sales Order for advance wire remittance.',
    items: [
      { id: 1, product: 'GPS-HSK-A63-24K', desc: 'GPS-HSK-A63-24K Precision Motorized Spindle Unit (15 kW, 24,000 RPM)', qty: 2, rate: 421000, discount: 0, gst: 18 }
    ]
  });

  // Calculate top KPI metrics
  const metrics = useMemo(() => {
    const draftPI = proformaInvoices.filter(p => p.status === 'Draft').length;
    const sentPI = proformaInvoices.filter(p => p.status === 'Sent').length;
    const accepted = proformaInvoices.filter(p => p.status === 'Accepted').length;
    const totalVal = proformaInvoices
      .filter(p => p.status !== 'Cancelled')
      .reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    const formattedVal = totalVal >= 100000 
      ? `₹${(totalVal / 100000).toFixed(2)}L` 
      : `₹${totalVal.toLocaleString('en-IN')}`;

    return { draftPI, sentPI, accepted, totalValue: formattedVal };
  }, [proformaInvoices]);

  // Filtered PI list
  const filteredPIs = useMemo(() => {
    return proformaInvoices.filter((pi) => {
      const matchesStatus = statusFilter === 'all' || pi.status.toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        pi.piNumber.toLowerCase().includes(q) ||
        pi.customer.toLowerCase().includes(q) ||
        (pi.salesOrder && pi.salesOrder.toLowerCase().includes(q)) ||
        (pi.gstin && pi.gstin.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [proformaInvoices, searchQuery, statusFilter]);

  // Handle preset customer change
  const handleCustomerSelect = (customerName) => {
    const matched = PRESET_CUSTOMERS.find(c => c.name === customerName);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        customer: matched.name,
        customerEmail: matched.email,
        customerContact: matched.contact,
        billingAddress: matched.billingAddress,
        shippingAddress: matched.shippingAddress,
        gstin: matched.gstin,
        salesOrder: matched.defaultSO
      }));
    } else {
      setFormData(prev => ({ ...prev, customer: customerName }));
    }
  };

  // Line item manipulation
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), product: '', desc: '', qty: 1, rate: 0, discount: 0, gst: 18 }
      ]
    }));
  };

  const handleRemoveItem = (id) => {
    if (formData.items.length <= 1) {
      onNotify('A Proforma Invoice must have at least one line item', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(it => it.id !== id)
    }));
  };

  const handleItemChange = (id, field, val) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === id ? { ...it, [field]: val } : it)
    }));
  };

  // Live item calculations
  const formCalculations = useMemo(() => {
    const subtotal = formData.items.reduce((s, it) => s + ((Number(it.qty) || 0) * (Number(it.rate) || 0)), 0);
    const discount = formData.items.reduce((s, it) => s + (Number(it.discount) || 0), 0);
    const taxable = Math.max(0, subtotal - discount);

    const isInterState = formData.gstin && !formData.gstin.startsWith('27');
    const gstTotal = formData.items.reduce((s, it) => {
      const lineTaxable = Math.max(0, ((Number(it.qty) || 0) * (Number(it.rate) || 0)) - (Number(it.discount) || 0));
      return s + (lineTaxable * ((Number(it.gst) || 18) / 100));
    }, 0);

    const cgst = isInterState ? 0 : gstTotal / 2;
    const sgst = isInterState ? 0 : gstTotal / 2;
    const igst = isInterState ? gstTotal : 0;
    const grandTotal = Math.round(taxable + gstTotal);

    return { subtotal, discount, taxable, gstTotal: Math.round(gstTotal), cgst: Math.round(cgst), sgst: Math.round(sgst), igst: Math.round(igst), grandTotal, isInterState };
  }, [formData.items, formData.gstin]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPIId(null);
    setFormData({
      customer: 'Tata Advanced Systems',
      customerEmail: 'tanmay@tataadvanced.com',
      customerContact: 'Mr. Tanmay Sharma (DGM - Procurement)',
      billingAddress: 'Aerospace Special Economic Zone, Hardware Park, Adibatla, Hyderabad, Telangana - 501510',
      shippingAddress: 'Tata Advanced Systems Tooling Bay, Chakan MIDC Phase II, Pune - 410501, Maharashtra',
      gstin: '36AAACT2718E1ZQ',
      salesOrder: 'SO-2026-041',
      piDate: '09 Sep 2026',
      validUntil: '24 Sep 2026',
      paymentTerms: '50% Advance with Proforma, 50% against Dispatch Inspection',
      notes: 'Proforma generated against confirmed Sales Order for advance wire remittance.',
      items: [
        { id: 1, product: 'GPS-HSK-A63-24K', desc: 'GPS-HSK-A63-24K Precision Motorized Spindle Unit (15 kW, 24,000 RPM)', qty: 2, rate: 421000, discount: 0, gst: 18 }
      ]
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (pi) => {
    setEditingPIId(pi.id);
    setFormData({
      customer: pi.customer,
      customerEmail: pi.customerEmail || '',
      customerContact: pi.customerContact || '',
      billingAddress: pi.billingAddress || '',
      shippingAddress: pi.shippingAddress || '',
      gstin: pi.gstin || '',
      salesOrder: pi.salesOrder || '',
      piDate: pi.date,
      validUntil: pi.validUntil,
      paymentTerms: pi.paymentTerms || '50% Advance with Proforma',
      notes: pi.notes || '',
      items: pi.items && pi.items.length > 0 ? pi.items.map(it => ({
        id: it.id || Math.random(),
        product: it.product || it.name,
        desc: it.desc || '',
        qty: it.qty,
        rate: it.rate || it.unitPrice,
        discount: it.discount || 0,
        gst: it.gst || 18
      })) : [{ id: 1, product: 'GPS Spindle System', desc: '', qty: 1, rate: 500000, discount: 0, gst: 18 }]
    });
    setIsCreateModalOpen(true);
  };

  // Save or Send PI in live database
  const handleSavePI = async (targetStatus = 'Draft') => {
    if (!formData.customer.trim()) {
      onNotify('Please enter a customer name', 'danger');
      return;
    }

    if (editingPIId) {
      const res = await proformaInvoiceService.updateProformaInvoiceStatus(editingPIId, targetStatus);
      if (res.error) {
        onNotify(res.error.message || 'Failed to update Proforma Invoice.', 'error');
        return;
      }
      onNotify(`Proforma Invoice ${editingPIId} updated successfully.`);
      setIsCreateModalOpen(false);
      await loadPIs();
    } else {
      const nextNum = proformaInvoices.length + 18;
      const newPiId = `PI-2026-0${nextNum}`;
      const res = await proformaInvoiceService.createProformaInvoice({
        piNumber: newPiId,
        customerName: formData.customer,
        customerEmail: formData.customerEmail,
        customerContact: formData.customerContact,
        customerAddress: formData.billingAddress,
        customerGstin: formData.gstin,
        salesOrderNo: formData.salesOrder,
        issueDate: formData.piDate,
        validUntil: formData.validUntil,
        paymentTerms: formData.paymentTerms,
        subtotal: formCalculations.subtotal,
        discount: formCalculations.discount,
        totalAmount: formCalculations.grandTotal,
        status: targetStatus,
        notes: formData.notes,
        items: formData.items
      });

      if (res.error) {
        onNotify(res.error.message || 'Failed to create Proforma Invoice in database.', 'error');
        return;
      }

      setIsCreateModalOpen(false);
      onNotify(`Proforma Invoice ${newPiId} generated successfully.`);
      await loadPIs();
    }
  };

  const handleOpenDetail = (pi) => {
    setSelectedPI(pi);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenEmail = (pi) => {
    setPiForEmail(pi);
    setIsEmailComposerOpen(true);
  };

  const handleOpenPreview = (pi) => {
    setPreviewDoc(pi);
    setIsPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Proforma Invoices" 
          subtitle="Loading live proforma invoices from PostgreSQL..."
          badge="Live Supabase"
        />
        <div className="section-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-icon" style={{ marginBottom: '12px', color: 'var(--primary)' }} />
          <div>Fetching commercial proformas, advance payment milestones, and line items...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Proforma Invoices" 
          subtitle="Commercial proformas, advance payment milestone billing, and Sales Order linkage"
          badge="Database Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {error.message || 'Unable to retrieve proforma invoices from PostgreSQL database.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadPIs}>
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
        title="Proforma Invoices" 
        subtitle="Commercial proformas, advance payment milestone billing, and Sales Order linkage"
        badge={`${proformaInvoices.length} Proforma Invoices`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => onNotify('Exported Proforma Invoice registry (Excel)')}
        >
          <Download size={14} />
          <span>Export PIs</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleOpenCreate}
        >
          <Plus size={14} />
          <span>+ Create Proforma Invoice</span>
        </button>
      </PageHeader>

      {/* 4 PI Dashboard Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Draft PI</span>
            <div className="metric-icon-wrap"><FileText size={16} /></div>
          </div>
          <div className="metric-value">{metrics.draftPI}</div>
          <div className="metric-footer" style={{ color: '#B7791F' }}>Commercial terms under review</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Sent PI</span>
            <div className="metric-icon-wrap"><Send size={16} /></div>
          </div>
          <div className="metric-value">{metrics.sentPI}</div>
          <div className="metric-footer" style={{ color: '#7A1F3D' }}>Awaiting client advance wire</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Accepted</span>
            <div className="metric-icon-wrap"><CheckCircle2 size={16} /></div>
          </div>
          <div className="metric-value">{metrics.accepted}</div>
          <div className="metric-footer" style={{ color: '#176B3A' }}>PO released & advance credited</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Value</span>
            <div className="metric-icon-wrap"><DollarSign size={16} /></div>
          </div>
          <div className="metric-value">{metrics.totalValue}</div>
          <div className="metric-footer" style={{ color: '#176B3A' }}>Pipeline advance billing</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="section-card">
        <div className="filter-bar">
          <div className="filter-group">
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search PI #, Customer, Sales Order..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <CustomSelect 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '170px' }}
              options={[
                { value: 'all', label: `All Statuses (${proformaInvoices.length})` },
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'expired', label: 'Expired' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>PI Number</th>
                <th>Customer</th>
                <th>Sales Order</th>
                <th>Date</th>
                <th>Valid Until</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPIs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No proforma invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPIs.map((pi) => (
                  <tr key={pi.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {pi.piNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{pi.customer}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pi.customerContact}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: '#F5E8ED', color: '#7A1F3D', fontWeight: 700, fontFamily: 'monospace' }}>
                        <Link2 size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                        {pi.salesOrder}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '12px' }}>{pi.date}</td>
                    <td className="mono" style={{ fontSize: '12px', color: '#B7791F', fontWeight: 600 }}>{pi.validUntil}</td>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {pi.formattedTotal || `₹${Number(pi.totalAmount).toLocaleString('en-IN')}`}
                    </td>
                    <td>
                      <StatusBadge status={pi.status} />
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '5px' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenDetail(pi)}
                          title="View PI Details"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenEdit(pi)}
                          title="Edit Proforma"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenPreview(pi)}
                          title="PDF Preview"
                        >
                          <FileText size={12} />
                          <span>PDF</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenEmail(pi)}
                          title="Email PI to Customer"
                        >
                          <Mail size={12} />
                          <span>Email</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PI MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingPIId ? `Edit Proforma Invoice: ${editingPIId}` : "+ Create Proforma Invoice"}
        maxWidth="840px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Total: <strong className="mono" style={{ color: '#7A1F3D', fontSize: '14px' }}>₹{formCalculations.grandTotal.toLocaleString('en-IN')}</strong> (Incl. GST)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsCreateModalOpen(false)}
              >
                Discard
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleSavePI('Draft')}
              >
                Save Draft
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleSavePI('Sent')}
              >
                <Send size={13} />
                <span>Send PI</span>
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSavePI('Sent'); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Customer Information */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12.5px' }}>
              <Building2 size={15} />
              <span>Customer Information</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Select Customer or Custom Name</label>
                <input 
                  list="pi-customer-presets"
                  className="form-control"
                  value={formData.customer}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  placeholder="e.g. Tata Advanced Systems"
                  required
                />
                <datalist id="pi-customer-presets">
                  {PRESET_CUSTOMERS.map(c => <option key={c.name} value={c.name} />)}
                </datalist>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Customer Email</label>
                <input 
                  type="email"
                  className="form-control"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Billing Address</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formData.billingAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Shipping Address</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, shippingAddress: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Customer GSTIN</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.gstin}
                  onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                  placeholder="36AAACT2718E1ZQ"
                />
              </div>
            </div>
          </div>

          {/* Sales Information & Order Reference */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12.5px' }}>
              <Link2 size={15} />
              <span>Sales Order Linkage & Commercial Terms</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Sales Order Reference</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.salesOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, salesOrder: e.target.value }))}
                  placeholder="e.g. SO-2026-041"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>PI Date</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.piDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, piDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Valid Until</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.validUntil}
                  onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Payment Terms</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#7A1F3D' }}>Spindle Line Items</span>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleAddItem}
              >
                <Plus size={12} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Product Model</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', width: '100px', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ padding: '6px 8px', width: '80px', textAlign: 'right' }}>Discount (₹)</th>
                    <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>GST%</th>
                    <th style={{ padding: '6px 8px', width: '100px', textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ padding: '6px 8px', width: '35px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((it) => {
                    const lineVal = Math.max(0, ((Number(it.qty) || 0) * (Number(it.rate) || 0)) - (Number(it.discount) || 0));
                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '28px', fontSize: '11.5px' }}
                            value={it.product} 
                            onChange={(e) => handleItemChange(it.id, 'product', e.target.value)}
                            placeholder="e.g. GPS-HSK-A63-24K"
                            required
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '28px', fontSize: '11.5px' }}
                            value={it.desc} 
                            onChange={(e) => handleItemChange(it.id, 'desc', e.target.value)}
                            placeholder="Description"
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            min="1"
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'center' }}
                            value={it.qty} 
                            onChange={(e) => handleItemChange(it.id, 'qty', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            min="0"
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'right' }}
                            value={it.rate} 
                            onChange={(e) => handleItemChange(it.id, 'rate', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            min="0"
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'right' }}
                            value={it.discount} 
                            onChange={(e) => handleItemChange(it.id, 'discount', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <select 
                            className="form-control mono"
                            style={{ height: '28px', fontSize: '11px', padding: '0 4px' }}
                            value={it.gst}
                            onChange={(e) => handleItemChange(it.id, 'gst', Number(e.target.value))}
                          >
                            <option value={18}>18%</option>
                            <option value={12}>12%</option>
                            <option value={28}>28%</option>
                            <option value={5}>5%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>
                        <td className="mono" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                          ₹{lineVal.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItem(it.id)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <div style={{ width: '280px', background: '#F8FAF9', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gross Subtotal:</span>
                  <span className="mono">₹{formCalculations.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {formCalculations.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16803C' }}>
                    <span>Commercial Discount:</span>
                    <span className="mono">-₹{formCalculations.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    GST ({formCalculations.isInterState ? 'IGST 18%' : 'CGST 9% + SGST 9%'}):
                  </span>
                  <span className="mono">₹{formCalculations.gstTotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 800, color: 'var(--primary)', fontSize: '13px' }}>
                  <span>Grand Total:</span>
                  <span className="mono">₹{formCalculations.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* PI DETAIL MODAL / DRAWER */}
      {selectedPI && (
        <Modal
          isOpen={isDetailDrawerOpen}
          onClose={() => setIsDetailDrawerOpen(false)}
          title={`Proforma Invoice: ${selectedPI.piNumber}`}
          maxWidth="840px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Linked to <strong className="mono" style={{ color: 'var(--primary)' }}>{selectedPI.salesOrder}</strong> • Status: {selectedPI.status}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setIsDetailDrawerOpen(false); handleOpenEdit(selectedPI); }}
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => window.print()}
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => handleOpenPreview(selectedPI)}
                >
                  <FileText size={13} />
                  <span>PDF Preview</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    handleOpenEmail(selectedPI);
                  }}
                >
                  <Mail size={13} />
                  <span>Email PI</span>
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Banner with SO link */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '14px 18px', 
              background: 'var(--primary-light)', 
              borderRadius: '6px',
              border: '1px solid var(--border-color)' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedPI.piNumber}
                  </h3>
                  <StatusBadge status={selectedPI.status} />
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    background: 'var(--bg-surface)', 
                    padding: '3px 8px', 
                    borderRadius: '4px',
                    border: '1px solid var(--primary)',
                    color: 'var(--primary)',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    <Link2 size={12} />
                    <span>Originated from {selectedPI.salesOrder}</span>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#5A1730', marginTop: '4px' }}>
                  Customer: <strong>{selectedPI.customer}</strong> • Issued: {selectedPI.date} • Valid Until: {selectedPI.validUntil}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#5A1730', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Proforma Value</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                  {selectedPI.formattedTotal || `₹${Number(selectedPI.totalAmount).toLocaleString('en-IN')}`}
                </div>
              </div>
            </div>

            {/* Customer & Billing Coordinates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Customer Dossier
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedPI.customerFullName || selectedPI.customer}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  <strong>Billing:</strong> {selectedPI.billingAddress || 'Industrial Area, Phase II'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  <strong>Shipping:</strong> {selectedPI.shippingAddress || selectedPI.billingAddress}
                </div>
                <div style={{ marginTop: '8px', fontSize: '11.5px' }}>
                  <div>Email: <strong style={{ color: 'var(--primary)' }}>{selectedPI.customerEmail || 'accounts@customer.com'}</strong></div>
                  <div>GSTIN: <strong className="mono">{selectedPI.gstin || '36AAACT2718E1ZQ'}</strong></div>
                </div>
              </div>

              {/* Bank Details */}
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Bank Coordinates for Advance Wire
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>Bank: <strong>ICICI BANK LIMITED, PUNE NANDED CITY</strong></div>
                  <div>Beneficiary: <strong>GENERAL PRECISION SPINDLES</strong></div>
                  <div>A/C Number: <strong className="mono">349105000701</strong></div>
                  <div>IFSC Code: <strong className="mono">ICIC0003491</strong></div>
                  <div>Payment Terms: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedPI.paymentTerms}</span></div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '12px' }}>
                Proforma Line Items & Commercial Breakdown
              </div>
              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Discount</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>GST</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPI.items && selectedPI.items.map((it, idx) => (
                    <tr key={it.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{it.product}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{it.desc}</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{it.qty}</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'right' }}>₹{Number(it.rate || 0).toLocaleString('en-IN')}</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'right', color: '#16803C' }}>-₹{Number(it.discount || 0).toLocaleString('en-IN')}</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center' }}>{it.gst || 18}%</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{Number(it.total || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax & GST Breakdown */}
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                  <div>CGST: <strong className="mono">₹{Number(selectedPI.cgstAmount || 0).toLocaleString('en-IN')}</strong></div>
                  <div>SGST: <strong className="mono">₹{Number(selectedPI.sgstAmount || 0).toLocaleString('en-IN')}</strong></div>
                  <div>IGST: <strong className="mono">₹{Number(selectedPI.igstAmount || selectedPI.gstAmount || 0).toLocaleString('en-IN')}</strong></div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div>Subtotal: <strong className="mono">₹{Number(selectedPI.subtotal || 0).toLocaleString('en-IN')}</strong></div>
                  <div>Grand Total: <strong className="mono" style={{ color: 'var(--primary)', fontSize: '13px' }}>{selectedPI.formattedTotal || `₹${Number(selectedPI.totalAmount).toLocaleString('en-IN')}`}</strong></div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedPI.notes && (
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11.5px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Notes: </span>
                <span style={{ color: 'var(--text-secondary)' }}>{selectedPI.notes}</span>
              </div>
            )}

            {/* Activity Timeline */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>Proforma Activity & Approval Timeline</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(selectedPI.timeline && selectedPI.timeline.length > 0 ? selectedPI.timeline : [
                  { id: 1, title: 'PI Created', detail: `Originated from ${selectedPI.salesOrder}`, time: selectedPI.date, user: 'Rahul Patil' },
                  { id: 2, title: 'PI Sent', detail: `Transmitted to ${selectedPI.customerEmail || 'client'}`, time: selectedPI.date, user: 'Rahul Patil' }
                ]).map((t, idx) => (
                  <div key={t.id || idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: 'var(--primary-light)', 
                      color: 'var(--primary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '10px', 
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      ✓
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>{t.title}</span>
                        <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{t.time}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {t.detail} • <span style={{ color: 'var(--primary)' }}>{t.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* OUTLOOK EMAIL COMPOSER */}
      {piForEmail && (
        <OutlookEmailComposer 
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          documentData={piForEmail}
          documentType="proforma_invoice"
          onNotify={onNotify}
          onSendSuccess={(emailRecord) => {
            setProformaInvoices(prev => prev.map(p => {
              if (p.id === piForEmail.id && p.status === 'Draft') {
                return { ...p, status: 'Sent' };
              }
              return p;
            }));
            onNotify(`Email sent successfully to ${emailRecord.to.join(', ')}`);
          }}
        />
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />
    </div>
  );
}
