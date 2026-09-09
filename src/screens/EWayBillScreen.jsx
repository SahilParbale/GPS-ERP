import React, { useState, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { E_WAY_BILLS } from '../data/mockData';
import { 
  Search, Plus, Eye, Printer, FileText, Send, 
  Download, Trash2, Edit3, Check, X, Building2, 
  User, Phone, MapPin, Mail, Clock, ShoppingCart, 
  CheckCircle2, AlertTriangle, Calendar, DollarSign,
  ChevronRight, ArrowRight, ShieldCheck, Truck, 
  Share2, FileCheck, Navigation
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';

const PRESET_INVOICES = [
  {
    invoice: 'INV-2026-019',
    customer: 'Tata Advanced Systems',
    customerFullName: 'Tata Advanced Systems Ltd',
    customerGstin: '36AAACT2718E1ZQ',
    address: 'Aerospace Special Economic Zone, Hardware Park, Adibatla, Hyderabad, Telangana - 501510',
    state: '36-Telangana',
    pin: '501510',
    product: 'GPS-HSK-A63-24K Motorized Spindle Unit',
    hsn: '84669390',
    qty: 2,
    unit: 'Sets',
    taxable: 842000,
    gst: 18,
    transporter: 'ABC Logistics',
    transporterId: '27AABCA9081T1Z5',
    vehicle: 'MH12AB1234',
    mode: 'Road',
    distance: '540 km'
  },
  {
    invoice: 'INV-2026-021',
    customer: 'Bharat Forge',
    customerFullName: 'Bharat Forge Ltd',
    customerGstin: '27AAACB1829D1Z2',
    address: 'Mundhwa Industrial Area, Pune Cantonment, Pune - 411036, Maharashtra',
    state: '27-Maharashtra',
    pin: '411036',
    product: 'GPS-BT40-15K Spindle Rebuild & Bearing Overhaul',
    hsn: '84669390',
    qty: 1,
    unit: 'Set',
    taxable: 544322,
    gst: 18,
    transporter: 'FastTrack Logistics',
    transporterId: '27AABCF4411Q1ZN',
    vehicle: 'MH14CD5678',
    mode: 'Road',
    distance: '35 km'
  },
  {
    invoice: 'INV-2026-024',
    customer: 'Godrej Aerospace',
    customerFullName: 'Godrej & Boyce Aerospace Division',
    customerGstin: '27AAACG0821M1Z5',
    address: 'Plant 14, Pirojshanagar, Vikhroli East, Mumbai - 400079',
    state: '27-Maharashtra',
    pin: '400079',
    product: 'GPS-HF-60K Ultra High-Speed Aerospace Spindle',
    hsn: '84669390',
    qty: 1,
    unit: 'Set',
    taxable: 1250000,
    gst: 18,
    transporter: 'V-Trans India Ltd',
    transporterId: '27AAACV1290K1ZX',
    vehicle: 'MH04EF9012',
    mode: 'Road',
    distance: '165 km'
  }
];

export default function EWayBillScreen({ onNavigate, onNotify }) {
  const [eWayBills, setEWayBills] = useState(E_WAY_BILLS);
  const [selectedEWB, setSelectedEWB] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [editingEWBId, setEditingEWBId] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Email & PDF Preview
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [ewbForEmail, setEwbForEmail] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Multi-section form state
  const [formSection, setFormSection] = useState('all'); // or 'document', 'customer', 'transport', 'goods'
  const [formData, setFormData] = useState({
    // DOCUMENT
    invoice: 'INV-2026-019',
    invoiceDate: '09 Sep 2026',
    transactionType: 'Supply',

    // CUSTOMER
    customer: 'Tata Advanced Systems',
    customerFullName: 'Tata Advanced Systems Ltd',
    customerGstin: '36AAACT2718E1ZQ',
    customerAddress: 'Aerospace Special Economic Zone, Hardware Park, Adibatla, Hyderabad, Telangana - 501510',
    customerState: '36-Telangana',
    customerPin: '501510',

    // TRANSPORT
    transporter: 'ABC Logistics',
    transporterId: '27AABCA9081T1Z5',
    vehicle: 'MH12AB1234',
    mode: 'Road',
    distance: '540 km',
    transportDocNo: 'LR-2026-88192',

    // GOODS
    goods: [
      { id: 1, product: 'GPS-HSK-A63-24K Motorized Spindle Unit', hsn: '84669390', quantity: 2, unit: 'Sets', taxableValue: 842000, gstRate: 18 }
    ]
  });

  // Calculate 4 KPI Metrics
  const metrics = useMemo(() => {
    const activeEWB = eWayBills.filter(e => e.status === 'Active').length;
    const expiringSoon = eWayBills.filter(e => e.status === 'Expiring Soon').length;
    const cancelled = eWayBills.filter(e => e.status === 'Cancelled').length;
    const thisMonth = eWayBills.length;
    return { activeEWB, expiringSoon, cancelled, thisMonth };
  }, [eWayBills]);

  // Filtered E-Way Bills
  const filteredEWBs = useMemo(() => {
    return eWayBills.filter((ewb) => {
      const matchesStatus = statusFilter === 'all' || ewb.status.toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        ewb.ewbNumber.toLowerCase().includes(q) ||
        ewb.invoice.toLowerCase().includes(q) ||
        ewb.customer.toLowerCase().includes(q) ||
        ewb.vehicle.toLowerCase().includes(q) ||
        ewb.transporter.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [eWayBills, searchQuery, statusFilter]);

  // Handle invoice preset selection
  const handleSelectInvoicePreset = (invNo) => {
    const matched = PRESET_INVOICES.find(p => p.invoice === invNo);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        invoice: matched.invoice,
        customer: matched.customer,
        customerFullName: matched.customerFullName,
        customerGstin: matched.customerGstin,
        customerAddress: matched.address,
        customerState: matched.state,
        customerPin: matched.pin,
        transporter: matched.transporter,
        transporterId: matched.transporterId,
        vehicle: matched.vehicle,
        mode: matched.mode,
        distance: matched.distance,
        goods: [
          {
            id: 1,
            product: matched.product,
            hsn: matched.hsn,
            quantity: matched.qty,
            unit: matched.unit,
            taxableValue: matched.taxable,
            gstRate: matched.gst
          }
        ]
      }));
    } else {
      setFormData(prev => ({ ...prev, invoice: invNo }));
    }
  };

  // Goods item management
  const handleAddGoodsItem = () => {
    setFormData(prev => ({
      ...prev,
      goods: [
        ...prev.goods,
        { id: Date.now(), product: '', hsn: '84669390', quantity: 1, unit: 'Sets', taxableValue: 0, gstRate: 18 }
      ]
    }));
  };

  const handleRemoveGoodsItem = (id) => {
    if (formData.goods.length <= 1) {
      onNotify('At least one goods line item is required for E-Way Bill generation', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      goods: prev.goods.filter(g => g.id !== id)
    }));
  };

  const handleGoodsChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      goods: prev.goods.map(g => g.id === id ? { ...g, [field]: value } : g)
    }));
  };

  // Live Summary Calculations
  const calculations = useMemo(() => {
    const taxableValue = formData.goods.reduce((s, g) => s + (Number(g.taxableValue) || 0), 0);
    const isInterState = formData.customerGstin && !formData.customerGstin.startsWith('27');

    const totalGst = formData.goods.reduce((s, g) => {
      const val = Number(g.taxableValue) || 0;
      const rate = Number(g.gstRate) || 18;
      return s + (val * (rate / 100));
    }, 0);

    const cgst = isInterState ? 0 : totalGst / 2;
    const sgst = isInterState ? 0 : totalGst / 2;
    const igst = isInterState ? totalGst : 0;
    const totalInvoiceValue = Math.round(taxableValue + totalGst);

    return { taxableValue, cgst: Math.round(cgst), sgst: Math.round(sgst), igst: Math.round(igst), totalGst: Math.round(totalGst), totalInvoiceValue, isInterState };
  }, [formData.goods, formData.customerGstin]);

  // Open Generate Modal
  const handleOpenGenerate = () => {
    setEditingEWBId(null);
    setFormData({
      invoice: 'INV-2026-019',
      invoiceDate: '09 Sep 2026',
      transactionType: 'Supply',
      customer: 'Tata Advanced Systems',
      customerFullName: 'Tata Advanced Systems Ltd',
      customerGstin: '36AAACT2718E1ZQ',
      customerAddress: 'Aerospace Special Economic Zone, Hardware Park, Adibatla, Hyderabad, Telangana - 501510',
      customerState: '36-Telangana',
      customerPin: '501510',
      transporter: 'ABC Logistics',
      transporterId: '27AABCA9081T1Z5',
      vehicle: 'MH12AB1234',
      mode: 'Road',
      distance: '540 km',
      transportDocNo: 'LR-2026-88192',
      goods: [
        { id: 1, product: 'GPS-HSK-A63-24K Motorized Spindle Unit', hsn: '84669390', quantity: 2, unit: 'Sets', taxableValue: 842000, gstRate: 18 }
      ]
    });
    setIsGenerateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ewb) => {
    setEditingEWBId(ewb.id);
    setFormData({
      invoice: ewb.invoice,
      invoiceDate: ewb.invoiceDate || '09 Sep 2026',
      transactionType: ewb.transactionType || 'Supply',
      customer: ewb.customer,
      customerFullName: ewb.customerFullName || ewb.customer,
      customerGstin: ewb.customerGstin || '',
      customerAddress: ewb.customerAddress || '',
      customerState: ewb.customerState || '',
      customerPin: ewb.customerPin || '',
      transporter: ewb.transporter,
      transporterId: ewb.transporterId || '',
      vehicle: ewb.vehicle,
      mode: ewb.mode || 'Road',
      distance: ewb.distance || '50 km',
      transportDocNo: ewb.transportDocNo || '',
      goods: ewb.goods && ewb.goods.length > 0 ? ewb.goods.map(g => ({
        id: g.id || Math.random(),
        product: g.product,
        hsn: g.hsn || '84669390',
        quantity: g.quantity || 1,
        unit: g.unit || 'Sets',
        taxableValue: g.taxableValue || 500000,
        gstRate: g.gstRate || 18
      })) : [{ id: 1, product: 'Precision Spindle Consignment', hsn: '84669390', quantity: 1, unit: 'Set', taxableValue: 500000, gstRate: 18 }]
    });
    setIsGenerateModalOpen(true);
  };

  // Save or Generate EWB
  const handleSaveEWB = (targetStatus = 'Active') => {
    if (!formData.customer.trim() || !formData.vehicle.trim()) {
      onNotify('Customer name and Vehicle number are mandatory', 'danger');
      return;
    }

    if (editingEWBId) {
      setEWayBills(prev => prev.map(e => {
        if (e.id === editingEWBId) {
          return {
            ...e,
            invoice: formData.invoice,
            invoiceDate: formData.invoiceDate,
            transactionType: formData.transactionType,
            customer: formData.customer,
            customerFullName: formData.customerFullName,
            customerGstin: formData.customerGstin,
            customerAddress: formData.customerAddress,
            customerState: formData.customerState,
            customerPin: formData.customerPin,
            transporter: formData.transporter,
            transporterId: formData.transporterId,
            vehicle: formData.vehicle,
            mode: formData.mode,
            distance: formData.distance,
            transportDocNo: formData.transportDocNo,
            status: targetStatus,
            taxableValue: calculations.taxableValue,
            cgstAmount: calculations.cgst,
            sgstAmount: calculations.sgst,
            igstAmount: calculations.igst,
            totalInvoiceValue: calculations.totalInvoiceValue,
            formattedTotal: `₹${calculations.totalInvoiceValue.toLocaleString('en-IN')}`,
            goods: formData.goods
          };
        }
        return e;
      }));

      onNotify(`E-Way Bill ${editingEWBId} updated successfully.`);
      if (selectedEWB?.id === editingEWBId) {
        setSelectedEWB(prev => ({ ...prev, status: targetStatus, vehicle: formData.vehicle }));
      }
    } else {
      const nextNum = eWayBills.length + 40;
      const newEwbId = `EWB-2026-00${nextNum}`;
      const newRecord = {
        id: newEwbId,
        ewbNumber: newEwbId,
        invoice: formData.invoice,
        invoiceDate: formData.invoiceDate,
        transactionType: formData.transactionType,
        customer: formData.customer,
        customerFullName: formData.customerFullName,
        customerGstin: formData.customerGstin,
        customerAddress: formData.customerAddress,
        customerState: formData.customerState,
        customerPin: formData.customerPin,
        supplierCompany: 'General Precision Spindles Pvt. Ltd.',
        supplierGstin: '27AABCG1492K1Z8',
        supplierAddress: 'Plot B-12, Nanded City Industrial Complex, Pune - 411041, Maharashtra',
        supplierState: '27-Maharashtra',
        supplierPin: '411041',
        transporter: formData.transporter,
        transporterId: formData.transporterId,
        vehicle: formData.vehicle,
        mode: formData.mode,
        distance: formData.distance,
        transportDocNo: formData.transportDocNo,
        transportDocDate: formData.invoiceDate,
        validFrom: `${formData.invoiceDate}, 09:00 AM`,
        validUntil: '16 Sep 2026, 11:59 PM',
        status: targetStatus,
        taxableValue: calculations.taxableValue,
        cgstAmount: calculations.cgst,
        sgstAmount: calculations.sgst,
        igstAmount: calculations.igst,
        totalInvoiceValue: calculations.totalInvoiceValue,
        formattedTotal: `₹${calculations.totalInvoiceValue.toLocaleString('en-IN')}`,
        isDemo: true,
        goods: formData.goods,
        timeline: [
          {
            id: 1,
            title: 'E-Way Bill Generated (Simulated Prototype)',
            detail: `Generated against ${formData.invoice} for vehicle ${formData.vehicle}`,
            time: 'Just now',
            user: 'Ganesh Pawar'
          }
        ]
      };

      setEWayBills(prev => [newRecord, ...prev]);
      onNotify(`E-Way Bill ${newEwbId} generated successfully.`);
    }

    setIsGenerateModalOpen(false);
  };

  const handleOpenDetail = (ewb) => {
    setSelectedEWB(ewb);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenEmail = (ewb) => {
    setEwbForEmail(ewb);
    setIsEmailComposerOpen(true);
  };

  const handleOpenPreview = (ewb) => {
    setPreviewDoc(ewb);
    setIsPreviewOpen(true);
  };

  const handleCancelEWB = (ewbId) => {
    setEWayBills(prev => prev.map(e => e.id === ewbId ? { ...e, status: 'Cancelled' } : e));
    if (selectedEWB?.id === ewbId) {
      setSelectedEWB(prev => ({ ...prev, status: 'Cancelled' }));
    }
    onNotify(`E-Way Bill ${ewbId} cancelled in local prototype state.`, 'warning');
  };

  return (
    <div className="content-area">
      <PageHeader 
        title="E-Way Bill System" 
        subtitle="Consignment transit passes, Part-A/Part-B transporter logistics & dispatch compliance"
        badge={`${eWayBills.length} E-Way Bills`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => onNotify('Exported active E-Way Bill registry')}
        >
          <Download size={14} />
          <span>Export Summary</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleOpenGenerate}
        >
          <Plus size={14} />
          <span>+ Generate E-Way Bill</span>
        </button>
      </PageHeader>

      {/* Prototype / Demo Alert Banner */}
      <div style={{ 
        background: '#FFF6DD', 
        border: '1px solid #FDE68A', 
        borderRadius: '6px', 
        padding: '10px 16px', 
        marginBottom: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        color: '#B7791F'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
          <AlertTriangle size={16} />
          <span>FRONTEND PROTOTYPE: DEMO / INTERNAL SIMULATION ONLY</span>
        </div>
        <div style={{ fontSize: '11.5px' }}>
          This module is a frontend demonstration and does NOT connect to the real National Informatics Centre (NIC) or GST portal.
        </div>
      </div>

      {/* 4 EWB Dashboard Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Active EWB</span>
            <div className="metric-icon-wrap"><Truck size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: '#16803C' }}>{metrics.activeEWB}</div>
          <div className="metric-footer" style={{ color: '#16803C' }}>Consignments in transit</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Expiring Soon</span>
            <div className="metric-icon-wrap"><Clock size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: '#B7791F' }}>{metrics.expiringSoon}</div>
          <div className="metric-footer" style={{ color: '#B7791F' }}>Valid window &lt; 24 hours</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Cancelled</span>
            <div className="metric-icon-wrap"><X size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: '#dc2626' }}>{metrics.cancelled}</div>
          <div className="metric-footer">Voided prior to movement</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Generated This Month</span>
            <div className="metric-icon-wrap"><FileCheck size={16} /></div>
          </div>
          <div className="metric-value">{metrics.thisMonth}</div>
          <div className="metric-footer" style={{ color: '#0F766E' }}>Total dispatch passes</div>
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
                placeholder="Search EWB #, Invoice, Vehicle, Transporter..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select 
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses ({eWayBills.length})</option>
              <option value="active">Active</option>
              <option value="expiring soon">Expiring Soon</option>
              <option value="draft">Draft</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>EWB Number</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Transporter</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEWBs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No E-Way Bills found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredEWBs.map((ewb) => (
                  <tr key={ewb.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {ewb.ewbNumber}
                    </td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {ewb.invoice}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ewb.customer}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ewb.customerGstin}</div>
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: '#0F766E' }}>
                      {ewb.vehicle}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{ewb.transporter}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ewb.mode} • {ewb.distance}</div>
                    </td>
                    <td className="mono" style={{ fontSize: '12px', color: ewb.status === 'Expiring Soon' ? '#B7791F' : 'var(--text-main)' }}>
                      {ewb.validUntil}
                    </td>
                    <td>
                      <StatusBadge status={ewb.status} />
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '5px' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenDetail(ewb)}
                          title="View E-Way Bill"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenEdit(ewb)}
                          title="Edit EWB"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenPreview(ewb)}
                          title="PDF Preview"
                        >
                          <FileText size={12} />
                          <span>PDF</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenEmail(ewb)}
                          title="Email EWB to Customer"
                        >
                          <Mail size={12} />
                          <span>Email</span>
                        </button>
                        {ewb.status !== 'Cancelled' && (
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 6px', color: '#dc2626' }}
                            onClick={() => handleCancelEWB(ewb.id)}
                            title="Cancel E-Way Bill"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MULTI-SECTION GENERATE E-WAY BILL MODAL */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title={editingEWBId ? `Edit E-Way Bill: ${editingEWBId}` : "+ Generate E-Way Bill (Internal Prototype)"}
        maxWidth="840px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Total Invoice: <strong className="mono" style={{ color: '#0F766E', fontSize: '14px' }}>₹{calculations.totalInvoiceValue.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsGenerateModalOpen(false)}
              >
                Discard
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleSaveEWB('Draft')}
              >
                Save Draft
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleSaveEWB('Active')}
              >
                <Truck size={13} />
                <span>Generate EWB</span>
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveEWB('Active'); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Section 1: DOCUMENT */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F766E', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} />
              <span>1. DOCUMENT INFORMATION</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Tax Invoice Number</label>
                <input 
                  list="invoice-presets"
                  className="form-control mono"
                  value={formData.invoice}
                  onChange={(e) => handleSelectInvoicePreset(e.target.value)}
                  placeholder="e.g. INV-2026-019"
                  required
                />
                <datalist id="invoice-presets">
                  {PRESET_INVOICES.map(p => <option key={p.invoice} value={p.invoice}>{p.customer}</option>)}
                </datalist>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Invoice Date</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Transaction Type</label>
                <select 
                  className="form-control"
                  value={formData.transactionType}
                  onChange={(e) => setFormData(prev => ({ ...prev, transactionType: e.target.value }))}
                >
                  <option value="Supply">Supply</option>
                  <option value="Export">Export</option>
                  <option value="Import">Import</option>
                  <option value="Job Work">Job Work</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: CUSTOMER */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F766E', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={15} />
              <span>2. RECIPIENT / CUSTOMER (PART-A)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Customer Name</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formData.customer}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Customer GSTIN</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.customerGstin}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerGstin: e.target.value.toUpperCase() }))}
                  placeholder="36AAACT2718E1ZQ"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Delivery Address</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Destination State</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formData.customerState}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerState: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>PIN Code</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.customerPin}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPin: e.target.value }))}
                  placeholder="501510"
                />
              </div>
            </div>
          </div>

          {/* Section 3: TRANSPORT */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F766E', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={15} />
              <span>3. TRANSPORT & VEHICLE (PART-B)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Transporter Name</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formData.transporter}
                  onChange={(e) => setFormData(prev => ({ ...prev, transporter: e.target.value }))}
                  placeholder="e.g. ABC Logistics"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Transporter ID / GSTIN</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.transporterId}
                  onChange={(e) => setFormData(prev => ({ ...prev, transporterId: e.target.value.toUpperCase() }))}
                  placeholder="27AABCA9081T1Z5"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Vehicle Number</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.vehicle}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicle: e.target.value.toUpperCase() }))}
                  placeholder="MH12AB1234"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Transport Mode</label>
                <select 
                  className="form-control"
                  value={formData.mode}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value }))}
                >
                  <option value="Road">Road</option>
                  <option value="Rail">Rail</option>
                  <option value="Air">Air</option>
                  <option value="Ship">Ship</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Distance</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.distance}
                  onChange={(e) => setFormData(prev => ({ ...prev, distance: e.target.value }))}
                  placeholder="540 km"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Transport Document No (LR / RR / Airway)</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.transportDocNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, transportDocNo: e.target.value }))}
                  placeholder="LR-2026-88192"
                />
              </div>
            </div>
          </div>

          {/* Section 4: GOODS */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F766E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Navigation size={15} />
                <span>4. GOODS CONSIGNMENT DETAILS</span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleAddGoodsItem}
              >
                <Plus size={12} />
                <span>Add Product</span>
              </button>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Product / Material</th>
                    <th style={{ padding: '6px 8px', width: '90px', textAlign: 'center' }}>HSN</th>
                    <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '6px 8px', width: '110px', textAlign: 'right' }}>Taxable Val (₹)</th>
                    <th style={{ padding: '6px 8px', width: '65px', textAlign: 'center' }}>GST%</th>
                    <th style={{ padding: '6px 8px', width: '110px', textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ padding: '6px 8px', width: '35px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.goods.map((g) => {
                    const lineGst = (Number(g.taxableValue) || 0) * ((Number(g.gstRate) || 18) / 100);
                    const lineTotal = (Number(g.taxableValue) || 0) + lineGst;
                    return (
                      <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '28px', fontSize: '11.5px' }}
                            value={g.product} 
                            onChange={(e) => handleGoodsChange(g.id, 'product', e.target.value)}
                            placeholder="e.g. GPS Spindle Assembly"
                            required
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'center' }}
                            value={g.hsn} 
                            onChange={(e) => handleGoodsChange(g.id, 'hsn', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            min="1"
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'center' }}
                            value={g.quantity} 
                            onChange={(e) => handleGoodsChange(g.id, 'quantity', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <select 
                            className="form-control"
                            style={{ height: '28px', fontSize: '11px', padding: '0 4px' }}
                            value={g.unit}
                            onChange={(e) => handleGoodsChange(g.id, 'unit', e.target.value)}
                          >
                            <option value="Sets">Sets</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Units">Units</option>
                            <option value="Job">Job</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            min="0"
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'right' }}
                            value={g.taxableValue} 
                            onChange={(e) => handleGoodsChange(g.id, 'taxableValue', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <select 
                            className="form-control mono"
                            style={{ height: '28px', fontSize: '11px', padding: '0 4px' }}
                            value={g.gstRate}
                            onChange={(e) => handleGoodsChange(g.id, 'gstRate', Number(e.target.value))}
                          >
                            <option value={18}>18%</option>
                            <option value={12}>12%</option>
                            <option value={28}>28%</option>
                            <option value={5}>5%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>
                        <td className="mono" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                          ₹{Math.round(lineTotal).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveGoodsItem(g.id)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            title="Remove line"
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

            {/* Section 5: SUMMARY */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <div style={{ width: '290px', background: '#F8FAF9', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Taxable Value:</span>
                  <span className="mono">₹{calculations.taxableValue.toLocaleString('en-IN')}</span>
                </div>
                {calculations.cgst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>CGST:</span>
                    <span className="mono">₹{calculations.cgst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {calculations.sgst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>SGST:</span>
                    <span className="mono">₹{calculations.sgst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {calculations.igst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IGST (18%):</span>
                    <span className="mono">₹{calculations.igst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 800, color: '#0F766E', fontSize: '13px' }}>
                  <span>Total Invoice Value:</span>
                  <span className="mono">₹{calculations.totalInvoiceValue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* E-WAY BILL DETAIL MODAL / DRAWER */}
      {selectedEWB && (
        <Modal
          isOpen={isDetailDrawerOpen}
          onClose={() => setIsDetailDrawerOpen(false)}
          title={`E-Way Bill: ${selectedEWB.ewbNumber}`}
          maxWidth="840px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Vehicle: <strong className="mono" style={{ color: '#0F766E' }}>{selectedEWB.vehicle}</strong> • Valid Until: {selectedEWB.validUntil}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
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
                  onClick={() => handleOpenPreview(selectedEWB)}
                >
                  <FileText size={13} />
                  <span>PDF Preview</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => onNotify(`Transit pass link copied for ${selectedEWB.ewbNumber}`)}
                >
                  <Share2 size={13} />
                  <span>Share</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    handleOpenEmail(selectedEWB);
                  }}
                >
                  <Mail size={13} />
                  <span>Email EWB</span>
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Prototype disclaimer */}
            <div style={{ 
              background: '#FFF6DD', 
              border: '1px solid #FDE68A', 
              borderRadius: '6px', 
              padding: '8px 14px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              color: '#B7791F'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} />
                <span>INTERNAL ERP PROTOTYPE RECORD</span>
              </div>
              <span style={{ fontSize: '10.5px' }}>Compliant with GST Rule 138 Dispatch Standard</span>
            </div>

            {/* Header Banner */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '14px 18px', 
              background: '#E6F4F1', 
              borderRadius: '6px',
              border: '1px solid #c7e8e1' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F766E' }}>
                    {selectedEWB.ewbNumber}
                  </h3>
                  <StatusBadge status={selectedEWB.status} />
                </div>
                <div style={{ fontSize: '12px', color: '#134e48', marginTop: '4px' }}>
                  Invoice: <strong>{selectedEWB.invoice}</strong> • Generated: {selectedEWB.validFrom || selectedEWB.invoiceDate}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#134e48', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invoice Value</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#0F766E' }}>
                  {selectedEWB.formattedTotal || `₹${Number(selectedEWB.totalInvoiceValue).toLocaleString('en-IN')}`}
                </div>
              </div>
            </div>

            {/* Simulated Barcode Banner */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px 14px', 
              background: '#F8FAF9', 
              border: '1px dashed #cbd5e1', 
              borderRadius: '6px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  fontFamily: 'monospace', 
                  letterSpacing: '5px', 
                  fontSize: '18px', 
                  fontWeight: 800, 
                  color: '#1e293b',
                  background: '#e2e8f0',
                  padding: '4px 10px',
                  borderRadius: '3px'
                }}>
                  ||| |||| | ||| |||| |
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>12-Digit E-Way Bill Barcode & Dispatch Clearance</div>
                  <div className="mono" style={{ fontSize: '10.5px', color: '#475569' }}>Doc Reference: {selectedEWB.transportDocNo || 'LR-2026-88192'}</div>
                </div>
              </div>
              <div className="mono" style={{ fontSize: '11px', color: '#0F766E', fontWeight: 600 }}>
                Valid Until: {selectedEWB.validUntil}
              </div>
            </div>

            {/* Supplier & Customer Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#F8FAF9' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Supplier (From)
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedEWB.supplierCompany || 'General Precision Spindles Pvt. Ltd.'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedEWB.supplierAddress || 'Plot B-12, Nanded City Industrial Complex, Pune - 411041'}
                </div>
                <div style={{ marginTop: '6px', fontSize: '11.5px' }}>
                  GSTIN: <strong className="mono">{selectedEWB.supplierGstin || '27AABCG1492K1Z8'}</strong>
                </div>
              </div>

              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#F8FAF9' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Recipient / Customer (To)
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedEWB.customerFullName || selectedEWB.customer}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedEWB.customerAddress}
                </div>
                <div style={{ marginTop: '6px', fontSize: '11.5px' }}>
                  GSTIN: <strong className="mono">{selectedEWB.customerGstin}</strong>
                </div>
              </div>
            </div>

            {/* Transport & Vehicle Details (Part-B) */}
            <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={14} />
                <span>Part-B: Transporter & Vehicle Tracking</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '11.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Transporter:</span>
                  <div style={{ fontWeight: 600 }}>{selectedEWB.transporter}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Vehicle Number:</span>
                  <div className="mono" style={{ fontWeight: 700, color: '#0F766E' }}>{selectedEWB.vehicle}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mode & Distance:</span>
                  <div style={{ fontWeight: 600 }}>{selectedEWB.mode || 'Road'} • {selectedEWB.distance || '540 km'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>LR / Document:</span>
                  <div className="mono" style={{ fontWeight: 600 }}>{selectedEWB.transportDocNo || 'LR-88192'}</div>
                </div>
              </div>
            </div>

            {/* Goods Table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '12px' }}>
                Consignment Goods Specification
              </div>
              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#ffffff', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>HSN</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Taxable Value (₹)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>GST%</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEWB.goods && selectedEWB.goods.map((g, idx) => (
                    <tr key={g.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{g.product}</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center' }}>{g.hsn || '84669390'}</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>
                        {g.quantity} {g.unit || 'Sets'}
                      </td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'right' }}>
                        ₹{Number(g.taxableValue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center' }}>{g.gstRate || 18}%</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                        ₹{Number(g.totalValue || (g.taxableValue * 1.18)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '10px 14px', background: '#F8FAF9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', gap: '14px', color: 'var(--text-secondary)' }}>
                  <div>CGST: <strong className="mono">₹{Number(selectedEWB.cgstAmount || 0).toLocaleString('en-IN')}</strong></div>
                  <div>SGST: <strong className="mono">₹{Number(selectedEWB.sgstAmount || 0).toLocaleString('en-IN')}</strong></div>
                  <div>IGST: <strong className="mono">₹{Number(selectedEWB.igstAmount || 0).toLocaleString('en-IN')}</strong></div>
                </div>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div>Taxable: <strong className="mono">₹{Number(selectedEWB.taxableValue || 0).toLocaleString('en-IN')}</strong></div>
                  <div>Total Invoice: <strong className="mono" style={{ color: '#0F766E', fontSize: '13px' }}>{selectedEWB.formattedTotal || `₹${Number(selectedEWB.totalInvoiceValue).toLocaleString('en-IN')}`}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* OUTLOOK EMAIL COMPOSER */}
      {ewbForEmail && (
        <OutlookEmailComposer 
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          documentData={ewbForEmail}
          documentType="eway_bill"
          onNotify={onNotify}
          onSendSuccess={(emailRecord) => {
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
