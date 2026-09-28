import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import Tabs from '../components/common/Tabs';
import CustomSelect from '../components/common/CustomSelect';
import { ewayBillService } from '../services/database/ewayBillService';
import { logisticsService } from '../services/database/logisticsService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { 
  Search, Plus, Eye, Printer, FileText, Send, 
  Download, Trash2, Edit3, Check, X, Building2, 
  User, Phone, MapPin, Mail, Clock, ShoppingCart, 
  CheckCircle2, AlertTriangle, Calendar, DollarSign,
  ChevronRight, ArrowRight, ShieldCheck, Truck, 
  Share2, FileCheck, Navigation, RefreshCw, AlertCircle,
  Package, Box
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
  const [activeMainTab, setActiveMainTab] = useState('ewb');
  const [eWayBills, setEWayBills] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dispatchesError, setDispatchesError] = useState(null);
  const [selectedEWB, setSelectedEWB] = useState(null);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dispatchSearchQuery, setDispatchSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadEWBs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [ewbRes, dspRes] = await Promise.all([
        ewayBillService.getEWayBills(),
        logisticsService.getDispatches()
      ]);
      if (ewbRes.error) throw ewbRes.error;
      setEWayBills(ewbRes.data || []);
      if (dspRes.error) {
        setDispatchesError(dspRes.error);
      } else {
        setDispatches(dspRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load E-Way bills from live database:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEWBs();
  }, []);

  // Live NIC Gateway Integration Status
  const [nicStatus, setNicStatus] = useState({
    environment: 'PREPROD',
    is_configured: false,
    loaded: false
  });

  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    ewayBillService.getIntegrationStatus().then(res => {
      setNicStatus({
        environment: res?.environment || 'PREPROD',
        is_configured: Boolean(res?.is_configured),
        loaded: true
      });
    });
  }, []);

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

  // Phase 8: Dispatches Metrics & Filtered List
  const dispatchMetrics = useMemo(() => {
    const total = dispatches.length;
    const inTransit = dispatches.filter(d => d.status === 'In Transit').length;
    const delivered = dispatches.filter(d => d.status === 'Delivered').length;
    const preparing = dispatches.filter(d => d.status === 'Preparing').length;
    return { total, inTransit, delivered, preparing };
  }, [dispatches]);

  const filteredDispatches = useMemo(() => {
    return dispatches.filter(d => {
      const q = dispatchSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (d.dispatchNumber && d.dispatchNumber.toLowerCase().includes(q)) ||
        (d.customer && d.customer.toLowerCase().includes(q)) ||
        (d.destination && d.destination.toLowerCase().includes(q)) ||
        (d.transporter && d.transporter.toLowerCase().includes(q)) ||
        (d.vehicle && d.vehicle.toLowerCase().includes(q)) ||
        (d.status && d.status.toLowerCase().includes(q))
      );
    });
  }, [dispatches, dispatchSearchQuery]);

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
    setSubmitError(null);
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
  const handleSaveEWB = async (targetStatus = 'Active') => {
    if (!formData.customer.trim() || !formData.vehicle.trim()) {
      onNotify('Customer name and Vehicle number are mandatory', 'danger');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (editingEWBId) {
        onNotify(`Updating E-Way Bill ${editingEWBId}...`);
      } else {
        const payload = {
          invoiceNumber: formData.invoice,
          customerName: formData.customerFullName || formData.customer,
          customerGstin: formData.customerGstin,
          customerAddress: formData.customerAddress,
          vehicleNumber: formData.vehicle,
          transporterName: formData.transporter,
          transporterId: formData.transporterId,
          transportMode: formData.mode,
          transportDocNo: formData.transportDocNo,
          distanceKm: parseInt(String(formData.distance).replace(/[^0-9]/g, ''), 10) || 50,
          totalInvoiceValue: calculations.totalInvoiceValue,
          status: targetStatus,
          goods: formData.goods
        };
        const res = await ewayBillService.createEWayBill(payload);
        if (res.error) throw res.error;
        onNotify(`E-Way Bill generated successfully via official NIC gateway.`, 'success');
      }
      await loadEWBs();
      setIsGenerateModalOpen(false);
    } catch (err) {
      console.error('Error saving E-Way Bill:', err);
      const msg = err.message || 'Failed to save E-Way Bill';
      setSubmitError(msg);
      onNotify(msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
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

  const handleCancelEWB = async (ewbId) => {
    try {
      const res = await ewayBillService.cancelEWayBill(ewbId, 'Cancelled by user from ERP interface');
      if (res.error) throw res.error;
      onNotify(`E-Way Bill ${ewbId} cancelled successfully.`, 'warning');
      await loadEWBs();
      if (selectedEWB?.id === ewbId) {
        setSelectedEWB(prev => ({ ...prev, status: 'Cancelled' }));
      }
    } catch (err) {
      console.error('Error cancelling E-Way Bill:', err);
      onNotify(err.message || 'Failed to cancel E-Way Bill', 'danger');
    }
  };

  if (isLoading) {
    return <TablePageSkeleton columns={['120px', '160px', '140px', '120px', '90px', '80px', '70px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="E-Way Bill System" 
          subtitle="Consignment transit passes, Part-A/Part-B transporter logistics & dispatch compliance"
          badge="Database Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {error.message || 'Unable to retrieve E-Way Bills from PostgreSQL database.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadEWBs}>
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

      {/* Top Module Navigation Tabs */}
      <Tabs
        tabs={[
          { id: 'ewb', label: 'E-Way Bills & Part-A/B Passes', count: eWayBills.length },
          { id: 'dispatches', label: 'Consignment Dispatches & Logistics Tracking', count: dispatches.length }
        ]}
        activeTab={activeMainTab}
        onChange={setActiveMainTab}
      />

      {activeMainTab === 'ewb' && (
        <>
          {/* Official NIC / GST Integration Status Banner */}
      <div style={{ 
        background: nicStatus.is_configured 
          ? (nicStatus.environment === 'PROD' ? '#EAF6EE' : '#FFF5DD') 
          : '#FCF8F9', 
        border: `1px solid ${nicStatus.is_configured ? (nicStatus.environment === 'PROD' ? '#C2ECD0' : '#FDE68A') : 'var(--border-color)'}`, 
        borderRadius: '6px', 
        padding: '10px 16px', 
        marginBottom: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        color: nicStatus.is_configured 
          ? (nicStatus.environment === 'PROD' ? '#176B3A' : '#9A6700') 
          : 'var(--text-main)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
          <ShieldCheck size={16} color="var(--primary)" />
          <span>
            {nicStatus.is_configured 
              ? (nicStatus.environment === 'PROD' ? 'OFFICIAL NIC / GST LIVE PRODUCTION GATEWAY (v1.03)' : 'NIC PRE-PRODUCTION / SANDBOX GATEWAY (v1.03)')
              : 'OFFICIAL NIC / GST E-WAY BILL GATEWAY (v1.03)'}
          </span>
          <span style={{
            fontSize: '10px',
            padding: '2px 7px',
            borderRadius: '4px',
            fontWeight: 700,
            background: nicStatus.is_configured ? (nicStatus.environment === 'PROD' ? '#176B3A' : '#9A6700') : 'var(--primary-light)',
            color: nicStatus.is_configured ? '#ffffff' : 'var(--primary)'
          }}>
            {nicStatus.is_configured ? (nicStatus.environment === 'PROD' ? 'LIVE PROD' : 'SANDBOX') : 'CREDENTIALS PENDING'}
          </span>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          {nicStatus.is_configured
            ? `Connected to official NIC API v1.03. Real RSA-PKCS1 + AES-256-ECB cryptographic transit clearance active.`
            : `Authoritative server-side gateway active. Production transit clearance requires registered GSTIN API credentials.`}
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
          <div className="metric-footer" style={{ color: 'var(--primary)' }}>Total dispatch passes</div>
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

            <CustomSelect 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '185px' }}
            >
              <option value="all">All Statuses ({eWayBills.length})</option>
              <option value="active">Active</option>
              <option value="expiring soon">Expiring Soon</option>
              <option value="draft">Draft</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </CustomSelect>
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
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
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
      </>
      )}

      {/* ========================================================================= */}
      {/* PHASE 8: CONSIGNMENT DISPATCHES & LOGISTICS TRACKING                      */}
      {/* ========================================================================= */}
      {activeMainTab === 'dispatches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Dispatches Metric Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Total Dispatches</span>
                <div className="metric-icon-wrap"><Truck size={16} /></div>
              </div>
              <div className="metric-value" style={{ color: 'var(--primary)' }}>{dispatchMetrics.total}</div>
              <div className="metric-footer" style={{ color: 'var(--text-muted)' }}>Registered consignment passes</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">In Transit</span>
                <div className="metric-icon-wrap"><Navigation size={16} /></div>
              </div>
              <div className="metric-value" style={{ color: '#047857' }}>{dispatchMetrics.inTransit}</div>
              <div className="metric-footer" style={{ color: '#047857' }}>En route to client plants</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Preparing in Bay</span>
                <div className="metric-icon-wrap"><Package size={16} /></div>
              </div>
              <div className="metric-value" style={{ color: '#b45309' }}>{dispatchMetrics.preparing}</div>
              <div className="metric-footer" style={{ color: '#b45309' }}>Crate packaging & inspection</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span className="metric-label">Delivered</span>
                <div className="metric-icon-wrap"><CheckCircle2 size={16} /></div>
              </div>
              <div className="metric-value" style={{ color: '#0284c7' }}>{dispatchMetrics.delivered}</div>
              <div className="metric-footer" style={{ color: '#0284c7' }}>Verified delivery receipts</div>
            </div>
          </div>

          {dispatchesError && (
            <div className="section-card" style={{ padding: '24px', textAlign: 'center' }}>
              <AlertCircle size={28} color="#dc2626" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                {dispatchesError.message || 'Unable to retrieve live dispatch consignments.'}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  const res = await logisticsService.getDispatches();
                  if (res.data) setDispatches(res.data);
                }}
              >
                <RefreshCw size={12} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {!dispatchesError && (
            <div className="section-card">
              <div className="card-header">
                <div className="card-title">
                  <Box size={16} color="#7A1F3D" />
                  <span>Consignment Dispatches & Logistics Movement Register</span>
                </div>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search dispatch, carrier, vehicle..."
                    value={dispatchSearchQuery}
                    onChange={(e) => setDispatchSearchQuery(e.target.value)}
                    style={{ paddingLeft: '32px', height: '32px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dispatch #</th>
                      <th>Customer & Destination</th>
                      <th>Transporter / Carrier</th>
                      <th>Vehicle & Driver</th>
                      <th>Packaging Spec</th>
                      <th>Dispatch Date</th>
                      <th>ETA</th>
                      <th>Crate Items</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDispatches.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No dispatch records found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDispatches.map((dsp) => (
                        <tr key={dsp.id}>
                          <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '11.5px' }}>
                            {dsp.dispatchNumber}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)' }}>
                              {dsp.customer}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {dsp.destination}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '12px' }}>{dsp.transporter}</div>
                            {dsp.transporterPhone && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📞 {dsp.transporterPhone}</div>
                            )}
                          </td>
                          <td>
                            <div className="mono" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '11.5px' }}>
                              {dsp.vehicle}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {dsp.driverName}
                            </div>
                          </td>
                          <td style={{ fontSize: '11.5px', maxWidth: '180px' }} title={dsp.packagingType}>
                            {dsp.packagingType}
                          </td>
                          <td className="mono" style={{ fontSize: '11.5px' }}>
                            {dsp.dispatchDate}
                          </td>
                          <td className="mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {dsp.estimatedArrival}
                          </td>
                          <td className="mono" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--primary)' }}>
                            {dsp.itemCount} unit{dsp.itemCount > 1 ? 's' : ''}
                          </td>
                          <td>
                            <StatusBadge status={dsp.status} size="sm" />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => {
                                setSelectedDispatch(dsp);
                                setIsDispatchModalOpen(true);
                              }}
                              title="View consignment crate items"
                            >
                              <Eye size={12} />
                              <span>View Crate</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MULTI-SECTION GENERATE E-WAY BILL MODAL */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title={editingEWBId ? `Edit E-Way Bill: ${editingEWBId}` : "+ Generate Official E-Way Bill (NIC API v1.03)"}
        maxWidth="840px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Total Invoice: <strong className="mono" style={{ color: 'var(--primary)', fontSize: '14px' }}>₹{calculations.totalInvoiceValue.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsGenerateModalOpen(false)}
                disabled={isSubmitting}
              >
                Discard
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleSaveEWB('Draft')}
                disabled={isSubmitting}
              >
                Save Draft
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleSaveEWB('Active')}
                disabled={isSubmitting}
              >
                <Truck size={13} />
                <span>{isSubmitting ? 'Transmitting to NIC...' : 'Generate EWB'}</span>
              </button>
            </div>
          </div>
        }
      >
        {submitError && (
          <div style={{
            background: '#FCEAEA',
            border: '1px solid #FECACA',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '12px',
            fontSize: '12px',
            color: '#B42318',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>NIC Gateway Error:</strong> {submitError}
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSaveEWB('Active'); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Section 1: DOCUMENT */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                <CustomSelect 
                  value={formData.transactionType}
                  onChange={(e) => setFormData(prev => ({ ...prev, transactionType: e.target.value }))}
                  options={[
                    { value: 'Supply', label: 'Supply' },
                    { value: 'Export', label: 'Export' },
                    { value: 'Import', label: 'Import' },
                    { value: 'Job Work', label: 'Job Work' },
                    { value: 'Others', label: 'Others' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Section 2: CUSTOMER */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: 'var(--bg-surface)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                <CustomSelect 
                  value={formData.mode}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode: e.target.value }))}
                  options={[
                    { value: 'Road', label: 'Road' },
                    { value: 'Rail', label: 'Rail' },
                    { value: 'Air', label: 'Air' },
                    { value: 'Ship', label: 'Ship' }
                  ]}
                />
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
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 800, color: 'var(--primary)', fontSize: '13px' }}>
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
                Vehicle: <strong className="mono" style={{ color: 'var(--primary)' }}>{selectedEWB.vehicle}</strong> • Valid Until: {selectedEWB.validUntil}
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
              background: 'var(--primary-light)', 
              borderRadius: '6px',
              border: '1px solid var(--border-color)' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedEWB.ewbNumber}
                  </h3>
                  <StatusBadge status={selectedEWB.status} />
                </div>
                <div style={{ fontSize: '12px', color: '#5A1730', marginTop: '4px' }}>
                  Invoice: <strong>{selectedEWB.invoice}</strong> • Generated: {selectedEWB.validFrom || selectedEWB.invoiceDate}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#5A1730', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invoice Value</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
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
              background: 'var(--bg-surface-subtle)', 
              border: '1px dashed var(--border-color)', 
              borderRadius: '6px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  fontFamily: 'monospace', 
                  letterSpacing: '5px', 
                  fontSize: '18px', 
                  fontWeight: 800, 
                  color: 'var(--text-main)',
                  background: 'var(--border-subtle)',
                  padding: '4px 10px',
                  borderRadius: '3px'
                }}>
                  ||| |||| | ||| |||| |
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>12-Digit E-Way Bill Barcode & Dispatch Clearance</div>
                  <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Doc Reference: {selectedEWB.transportDocNo || 'LR-2026-88192'}</div>
                </div>
              </div>
              <div className="mono" style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                Valid Until: {selectedEWB.validUntil}
              </div>
            </div>

            {/* Supplier & Customer Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
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

              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
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
            <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedEWB.vehicle}</div>
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
              <div style={{ padding: '8px 12px', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '12px' }}>
                Consignment Goods Specification
              </div>
              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
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
                    <tr key={g.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{g.product}</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center' }}>{g.hsn || '84669390'}</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>
                        {g.quantity} {g.unit || 'Sets'}
                      </td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'right' }}>
                        ₹{Number(g.taxableValue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center' }}>{g.gstRate || 18}%</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{Number(g.totalValue || (g.taxableValue * 1.18)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '10px 14px', background: 'var(--bg-surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', gap: '14px', color: 'var(--text-secondary)' }}>
                  <div>CGST: <strong className="mono">₹{Number(selectedEWB.cgstAmount || 0).toLocaleString('en-IN')}</strong></div>
                  <div>SGST: <strong className="mono">₹{Number(selectedEWB.sgstAmount || 0).toLocaleString('en-IN')}</strong></div>
                  <div>IGST: <strong className="mono">₹{Number(selectedEWB.igstAmount || 0).toLocaleString('en-IN')}</strong></div>
                </div>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div>Taxable: <strong className="mono">₹{Number(selectedEWB.taxableValue || 0).toLocaleString('en-IN')}</strong></div>
                  <div>Total Invoice: <strong className="mono" style={{ color: 'var(--primary)', fontSize: '13px' }}>{selectedEWB.formattedTotal || `₹${Number(selectedEWB.totalInvoiceValue).toLocaleString('en-IN')}`}</strong></div>
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

      {/* ========================================================================= */}
      {/* MODAL: DISPATCH CRATE DETAILS & PACKING LIST                              */}
      {/* ========================================================================= */}
      {isDispatchModalOpen && selectedDispatch && (
        <Modal
          isOpen={isDispatchModalOpen}
          onClose={() => setIsDispatchModalOpen(false)}
          title={`Consignment Packing Details: ${selectedDispatch.dispatchNumber}`}
          maxWidth="680px"
          footer={
            <button type="button" className="btn btn-primary" onClick={() => setIsDispatchModalOpen(false)}>
              Close
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Customer Consignee</span>
                <div style={{ fontWeight: 700 }}>{selectedDispatch.customer}</div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Delivery Destination</span>
                <div style={{ fontWeight: 600 }}>{selectedDispatch.destination}</div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Carrier & Vehicle</span>
                <div style={{ fontWeight: 600 }}>{selectedDispatch.transporter} • <span className="mono">{selectedDispatch.vehicle}</span></div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Associated E-Way Bill</span>
                <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedDispatch.ewbNumber}</div>
              </div>
            </div>

            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
              Packaged Items & Shock-Sensor Export Boxes
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Box #</th>
                    <th>Product Description</th>
                    <th>Spindle Serial</th>
                    <th>Qty</th>
                    <th>Gross Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedDispatch.items || []).length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        No individual items catalogued for this consignment.
                      </td>
                    </tr>
                  ) : (
                    selectedDispatch.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="mono" style={{ fontWeight: 700 }}>{item.package_box_number || `BOX-0${idx+1}`}</td>
                        <td style={{ fontWeight: 600 }}>{item.product_name || 'Motorized Spindle'}</td>
                        <td className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>{item.spindle_serial || 'SP-1042'}</td>
                        <td className="mono">{item.quantity || 1} Set</td>
                        <td className="mono">{item.gross_weight_kg || 48} kg</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
