import React, { useState, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { PURCHASE_ORDERS } from '../data/mockData';
import { 
  Search, Plus, Eye, Printer, FileText, Send, 
  Download, Trash2, Edit3, Check, X, Building2, 
  User, Phone, MapPin, Mail, Clock, ShoppingCart, 
  CheckCircle2, AlertCircle, Calendar, DollarSign,
  ChevronRight, ArrowRight, ShieldCheck, Truck
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';

const PRESET_SUPPLIERS = [
  {
    name: 'Schaeffler India',
    contact: 'Mr. Rajesh Nair (Sales Director - Spindle Bearings)',
    email: 'r.nair@schaeffler.com',
    phone: '+91 20 6608 4100',
    gstin: '27AAACS4821M1ZB',
    address: 'Pune Distribution Centre, Chakan MIDC Phase II, Pune - 410501, Maharashtra'
  },
  {
    name: 'Bharat Special Steel',
    contact: 'Mr. Manoj Gokhale (Head - Alloy Metallurgy)',
    email: 'sales@bharatspecialsteel.com',
    phone: '+91 20 2712 9182',
    gstin: '27AABCB9182L1ZX',
    address: 'Plot 42, Bhosari Industrial Area, Pune - 411026, Maharashtra'
  },
  {
    name: 'OTT Jakob',
    contact: 'Mr. K. S. Raman (Country Applications Manager)',
    email: 'raman@ottjakob-india.com',
    phone: '+91 80 4112 0900',
    gstin: '29AAACJ3918K1Z3',
    address: 'Bengaluru Technology Centre, 4th Phase, Peenya Industrial Area, Bengaluru - 560058'
  },
  {
    name: 'Heidenhain India',
    contact: 'Mr. Suresh Babu (Regional Head)',
    email: 'info@heidenhain.in',
    phone: '+91 22 2831 4910',
    gstin: '27AABCH4910D1Z7',
    address: 'Tech Park, Andheri East, Mumbai - 400069, Maharashtra'
  },
  {
    name: 'Sandvik Coromant India',
    contact: 'Ms. Priya Sharma (Key Accounts)',
    email: 'orders@sandvik.com',
    phone: '+91 20 6734 5000',
    gstin: '27AAACS1928F1ZG',
    address: 'Mumbai-Pune Road, Dapodi, Pune - 411012, Maharashtra'
  }
];

export default function PurchaseOrderScreen({ onNavigate, onNotify }) {
  const [purchaseOrders, setPurchaseOrders] = useState(PURCHASE_ORDERS);
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPOId, setEditingPOId] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Email and Document Preview
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [poForEmail, setPoForEmail] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form State for Create / Edit PO
  const [formData, setFormData] = useState({
    supplier: 'Schaeffler India',
    supplierContact: 'Mr. Rajesh Nair (Sales Director - Spindle Bearings)',
    supplierEmail: 'r.nair@schaeffler.com',
    supplierPhone: '+91 20 6608 4100',
    supplierGstin: '27AAACS4821M1ZB',
    supplierAddress: 'Pune Distribution Centre, Chakan MIDC Phase II, Pune - 410501, Maharashtra',
    poDate: '09 Sep 2026',
    expectedDelivery: '23 Sep 2026',
    paymentTerms: 'Net 30 Days from GRN inspection',
    deliveryAddress: 'General Precision Spindles Pvt. Ltd., Plot B-12 Nanded City Industrial Complex, Pune - 411041',
    notes: 'Standard OEM calibration certificates and DIN EN 10204 3.1 inspection reports mandatory.',
    items: [
      { id: 1, item: 'HC7014-E-T-P4S-UL', desc: 'FAG High-Precision Ceramic Angular Contact Spindle Bearings', qty: 2, unit: 'Pairs', rate: 72000, gst: 18 }
    ]
  });

  // Calculate top metrics
  const metrics = useMemo(() => {
    const openPOs = purchaseOrders.filter(p => p.status === 'Sent' || p.status === 'Approved').length;
    const pendingApproval = purchaseOrders.filter(p => p.status === 'Draft').length;
    const dueThisWeek = purchaseOrders.filter(p => p.status !== 'Cancelled' && p.status !== 'Received').length;
    const totalValue = purchaseOrders
      .filter(p => p.status !== 'Cancelled')
      .reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    const formattedVal = totalValue >= 100000 
      ? `₹${(totalValue / 100000).toFixed(2)}L` 
      : `₹${totalValue.toLocaleString('en-IN')}`;

    return { openPOs, pendingApproval, dueThisWeek, totalValue: formattedVal };
  }, [purchaseOrders]);

  // Filtered PO records
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesStatus = statusFilter === 'all' || po.status.toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        po.poNumber.toLowerCase().includes(q) ||
        po.supplier.toLowerCase().includes(q) ||
        (po.supplierGstin && po.supplierGstin.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [purchaseOrders, searchQuery, statusFilter]);

  // Handle supplier change in form
  const handleSupplierSelect = (supplierName) => {
    const matched = PRESET_SUPPLIERS.find(s => s.name === supplierName);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        supplier: matched.name,
        supplierContact: matched.contact,
        supplierEmail: matched.email,
        supplierPhone: matched.phone,
        supplierGstin: matched.gstin,
        supplierAddress: matched.address
      }));
    } else {
      setFormData(prev => ({ ...prev, supplier: supplierName }));
    }
  };

  // Line item manipulation
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), item: '', desc: '', qty: 1, unit: 'Pcs', rate: 0, gst: 18 }
      ]
    }));
  };

  const handleRemoveItem = (id) => {
    if (formData.items.length <= 1) {
      onNotify('A Purchase Order must contain at least one line item', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(it => it.id !== id)
    }));
  };

  const handleItemChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === id ? { ...it, [field]: value } : it)
    }));
  };

  // Live item totals in form
  const formTotals = useMemo(() => {
    const subtotal = formData.items.reduce((sum, it) => {
      const q = Number(it.qty) || 0;
      const r = Number(it.rate) || 0;
      return sum + (q * r);
    }, 0);

    const gst = formData.items.reduce((sum, it) => {
      const q = Number(it.qty) || 0;
      const r = Number(it.rate) || 0;
      const g = Number(it.gst) || 18;
      return sum + (q * r * (g / 100));
    }, 0);

    const grandTotal = Math.round(subtotal + gst);
    return { subtotal, gst: Math.round(gst), grandTotal };
  }, [formData.items]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPOId(null);
    setFormData({
      supplier: 'Schaeffler India',
      supplierContact: 'Mr. Rajesh Nair (Sales Director - Spindle Bearings)',
      supplierEmail: 'r.nair@schaeffler.com',
      supplierPhone: '+91 20 6608 4100',
      supplierGstin: '27AAACS4821M1ZB',
      supplierAddress: 'Pune Distribution Centre, Chakan MIDC Phase II, Pune - 410501, Maharashtra',
      poDate: '09 Sep 2026',
      expectedDelivery: '23 Sep 2026',
      paymentTerms: 'Net 30 Days from GRN inspection',
      deliveryAddress: 'General Precision Spindles Pvt. Ltd., Plot B-12 Nanded City Industrial Complex, Pune - 411041',
      notes: 'Standard OEM calibration certificates and DIN EN 10204 3.1 inspection reports mandatory.',
      items: [
        { id: 1, item: 'HC7014-E-T-P4S-UL', desc: 'FAG High-Precision Ceramic Angular Contact Spindle Bearings', qty: 2, unit: 'Pairs', rate: 72000, gst: 18 }
      ]
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (po) => {
    setEditingPOId(po.id);
    setFormData({
      supplier: po.supplier,
      supplierContact: po.supplierContact || '',
      supplierEmail: po.supplierEmail || '',
      supplierPhone: po.supplierPhone || '',
      supplierGstin: po.supplierGstin || '',
      supplierAddress: po.supplierAddress || '',
      poDate: po.date,
      expectedDelivery: po.expectedDelivery,
      paymentTerms: po.paymentTerms || 'Net 30 Days',
      deliveryAddress: po.deliveryAddress || 'Plot B-12 Nanded City Industrial Complex, Pune - 411041',
      notes: po.notes || '',
      items: po.items && po.items.length > 0 ? po.items.map(it => ({
        id: it.id || Math.random(),
        item: it.item || it.name,
        desc: it.desc || '',
        qty: it.qty,
        unit: it.unit || 'Pcs',
        rate: it.rate || it.unitPrice,
        gst: it.gst || 18
      })) : [{ id: 1, item: 'Spindle Bearing Component', desc: '', qty: 1, unit: 'Pcs', rate: 50000, gst: 18 }]
    });
    setIsCreateModalOpen(true);
  };

  // Save or Send PO
  const handleSavePO = (targetStatus = 'Draft') => {
    if (!formData.supplier.trim()) {
      onNotify('Please specify a supplier name', 'danger');
      return;
    }

    if (editingPOId) {
      // Update existing
      setPurchaseOrders(prev => prev.map(p => {
        if (p.id === editingPOId) {
          return {
            ...p,
            supplier: formData.supplier,
            supplierContact: formData.supplierContact,
            supplierEmail: formData.supplierEmail,
            supplierPhone: formData.supplierPhone,
            supplierGstin: formData.supplierGstin,
            supplierAddress: formData.supplierAddress,
            date: formData.poDate,
            expectedDelivery: formData.expectedDelivery,
            paymentTerms: formData.paymentTerms,
            deliveryAddress: formData.deliveryAddress,
            notes: formData.notes,
            status: targetStatus,
            subtotal: formTotals.subtotal,
            gstAmount: formTotals.gst,
            totalAmount: formTotals.grandTotal,
            formattedTotal: `₹${formTotals.grandTotal.toLocaleString('en-IN')}`,
            items: formData.items.map((it, idx) => ({
              id: it.id || idx + 1,
              item: it.item || `Item ${idx + 1}`,
              desc: it.desc || it.item,
              qty: Number(it.qty) || 1,
              unit: it.unit || 'Pcs',
              rate: Number(it.rate) || 0,
              gst: Number(it.gst) || 18,
              total: (Number(it.qty) || 1) * (Number(it.rate) || 0)
            }))
          };
        }
        return p;
      }));

      onNotify(`Purchase Order ${editingPOId} updated successfully.`);
      if (selectedPO && selectedPO.id === editingPOId) {
        setSelectedPO(prev => ({ ...prev, status: targetStatus, totalAmount: formTotals.grandTotal }));
      }
    } else {
      // Create new
      const nextNum = purchaseOrders.length + 1;
      const newPoId = `PO-2026-00${nextNum}`;
      const newRecord = {
        id: newPoId,
        poNumber: newPoId,
        supplier: formData.supplier,
        supplierContact: formData.supplierContact,
        supplierEmail: formData.supplierEmail,
        supplierPhone: formData.supplierPhone,
        supplierGstin: formData.supplierGstin,
        supplierAddress: formData.supplierAddress,
        date: formData.poDate,
        expectedDelivery: formData.expectedDelivery,
        paymentTerms: formData.paymentTerms,
        deliveryAddress: formData.deliveryAddress,
        notes: formData.notes,
        status: targetStatus,
        subtotal: formTotals.subtotal,
        taxRate: 18,
        gstAmount: formTotals.gst,
        totalAmount: formTotals.grandTotal,
        formattedTotal: `₹${formTotals.grandTotal.toLocaleString('en-IN')}`,
        items: formData.items.map((it, idx) => ({
          id: idx + 1,
          item: it.item || `Bearing Stock ${idx + 1}`,
          desc: it.desc || it.item,
          qty: Number(it.qty) || 1,
          unit: it.unit || 'Pcs',
          rate: Number(it.rate) || 0,
          gst: Number(it.gst) || 18,
          total: (Number(it.qty) || 1) * (Number(it.rate) || 0)
        })),
        timeline: [
          {
            id: 1,
            title: targetStatus === 'Sent' ? 'Purchase Order Created & Sent' : 'Purchase Order Created (Draft)',
            detail: targetStatus === 'Sent' ? `Directly emailed to ${formData.supplierEmail}` : 'Saved in draft state for technical approval',
            time: 'Just now',
            user: 'Ganesh Pawar'
          }
        ]
      };

      setPurchaseOrders(prev => [newRecord, ...prev]);
      onNotify(`Purchase Order ${newPoId} created successfully.`);
    }

    setIsCreateModalOpen(false);
  };

  // Row actions
  const handleOpenDetail = (po) => {
    setSelectedPO(po);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenEmail = (po) => {
    setPoForEmail(po);
    setIsEmailComposerOpen(true);
  };

  const handleOpenPreview = (po) => {
    setPreviewDoc(po);
    setIsPreviewOpen(true);
  };

  const handleCancelPO = (poId) => {
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: 'Cancelled' } : p));
    if (selectedPO?.id === poId) {
      setSelectedPO(prev => ({ ...prev, status: 'Cancelled' }));
    }
    onNotify(`Purchase Order ${poId} marked as Cancelled.`, 'warning');
  };

  return (
    <div className="content-area">
      <PageHeader 
        title="Purchase Order Management" 
        subtitle="Manage precision spindle components, alloy forgings, and vendor orders"
        badge={`${purchaseOrders.length} Purchase Orders`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => onNotify('Exported PO register to Excel spreadsheet')}
        >
          <Download size={14} />
          <span>Export POs</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleOpenCreate}
        >
          <Plus size={14} />
          <span>+ Create Purchase Order</span>
        </button>
      </PageHeader>

      {/* 4 PO Dashboard Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Open Purchase Orders</span>
            <div className="metric-icon-wrap"><ShoppingCart size={16} /></div>
          </div>
          <div className="metric-value">{metrics.openPOs}</div>
          <div className="metric-footer" style={{ color: '#7A1F3D' }}>Sent & In-transit with vendors</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Pending Approval</span>
            <div className="metric-icon-wrap"><Clock size={16} /></div>
          </div>
          <div className="metric-value">{metrics.pendingApproval}</div>
          <div className="metric-footer" style={{ color: '#9A6700' }}>Awaiting technical sign-off</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Due This Week</span>
            <div className="metric-icon-wrap"><Calendar size={16} /></div>
          </div>
          <div className="metric-value">{metrics.dueThisWeek}</div>
          <div className="metric-footer" style={{ color: '#7A1F3D' }}>Expected delivery to stores</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Purchase Value</span>
            <div className="metric-icon-wrap"><DollarSign size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>{metrics.totalValue}</div>
          <div className="metric-footer" style={{ color: '#176B3A' }}>Active procurement commitments</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="section-card">
        <div className="filter-bar">
          <div className="filter-group">
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="form-control"
                placeholder="Search PO #, Supplier, GSTIN..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select 
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses ({purchaseOrders.length})</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>PO Date</th>
                <th>Expected Delivery</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No purchase orders found matching your search.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id}>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {po.poNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{po.supplier}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{po.supplierContact}</div>
                    </td>
                    <td className="mono" style={{ fontSize: '12px' }}>{po.date}</td>
                    <td className="mono" style={{ fontSize: '12px', color: '#7A1F3D', fontWeight: 600 }}>
                      {po.expectedDelivery}
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {po.formattedTotal || `₹${Number(po.totalAmount).toLocaleString('en-IN')}`}
                    </td>
                    <td>
                      <StatusBadge status={po.status} />
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '5px' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenDetail(po)}
                          title="View PO Details"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenEdit(po)}
                          title="Edit PO"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenPreview(po)}
                          title="PDF Preview"
                        >
                          <FileText size={12} />
                          <span>PDF</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px' }}
                          onClick={() => handleOpenEmail(po)}
                          title="Email PO to Supplier"
                        >
                          <Mail size={12} />
                          <span>Email</span>
                        </button>
                        {po.status !== 'Cancelled' && po.status !== 'Received' && (
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 6px', color: '#dc2626' }}
                            onClick={() => handleCancelPO(po.id)}
                            title="Cancel PO"
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

      {/* CREATE / EDIT PO MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingPOId ? `Edit Purchase Order: ${editingPOId}` : "+ Create Purchase Order"}
        maxWidth="820px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Total: <strong className="mono" style={{ color: '#7A1F3D', fontSize: '14px' }}>₹{formTotals.grandTotal.toLocaleString('en-IN')}</strong> (Incl. GST)
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
                onClick={() => handleSavePO('Draft')}
              >
                Save Draft
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleSavePO('Sent')}
              >
                <Send size={13} />
                <span>Send PO</span>
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSavePO('Sent'); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Supplier Information Section */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12.5px' }}>
              <Building2 size={15} />
              <span>Supplier Information</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Select or Type Supplier</label>
                <input 
                  list="supplier-presets"
                  className="form-control"
                  value={formData.supplier}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  placeholder="e.g. Schaeffler India"
                  required
                />
                <datalist id="supplier-presets">
                  {PRESET_SUPPLIERS.map(s => <option key={s.name} value={s.name} />)}
                </datalist>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Supplier Contact Person</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formData.supplierContact}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplierContact: e.target.value }))}
                  placeholder="e.g. Mr. Rajesh Nair"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Supplier Email</label>
                <input 
                  type="email"
                  className="form-control"
                  value={formData.supplierEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplierEmail: e.target.value }))}
                  placeholder="vendor@company.com"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Supplier GSTIN</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.supplierGstin}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplierGstin: e.target.value.toUpperCase() }))}
                  placeholder="27AAACS4821M1ZB"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Supplier Address</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formData.supplierAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                  placeholder="City, State, PIN"
                />
              </div>
            </div>
          </div>

          {/* PO Commercial & Delivery Information */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12.5px' }}>
              <Truck size={15} />
              <span>PO Information & Delivery Terms</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>PO Date</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.poDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, poDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Expected Delivery Date</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formData.expectedDelivery}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedDelivery: e.target.value }))}
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

            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Delivery Address</label>
              <input 
                type="text"
                className="form-control"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#7A1F3D' }}>Line Items</span>
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
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item / Part #</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '6px 8px', width: '65px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '6px 8px', width: '100px', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ padding: '6px 8px', width: '65px', textAlign: 'center' }}>GST%</th>
                    <th style={{ padding: '6px 8px', width: '100px', textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ padding: '6px 8px', width: '35px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((it) => {
                    const lineTotal = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '28px', fontSize: '11.5px' }}
                            value={it.item} 
                            onChange={(e) => handleItemChange(it.id, 'item', e.target.value)}
                            placeholder="e.g. HC7014-E-T-P4S"
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
                            placeholder="Item description"
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
                          <select 
                            className="form-control"
                            style={{ height: '28px', fontSize: '11px', padding: '0 4px' }}
                            value={it.unit}
                            onChange={(e) => handleItemChange(it.id, 'unit', e.target.value)}
                          >
                            <option value="Pcs">Pcs</option>
                            <option value="Pairs">Pairs</option>
                            <option value="Sets">Sets</option>
                            <option value="Bars">Bars</option>
                            <option value="Kg">Kg</option>
                          </select>
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
                          ₹{lineTotal.toLocaleString('en-IN')}
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
              <div style={{ width: '260px', background: '#F8FAF9', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                  <span className="mono">₹{formTotals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>GST:</span>
                  <span className="mono">₹{formTotals.gst.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 800, color: '#7A1F3D', fontSize: '13px' }}>
                  <span>Grand Total:</span>
                  <span className="mono">₹{formTotals.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label" style={{ fontSize: '11px' }}>Purchase Order Notes & Quality Criteria</label>
            <textarea 
              className="form-control"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Test certificates, CoC, dispatch packing guidelines"
            />
          </div>
        </form>
      </Modal>

      {/* PURCHASE ORDER DETAIL MODAL / DRAWER */}
      {selectedPO && (
        <Modal
          isOpen={isDetailDrawerOpen}
          onClose={() => setIsDetailDrawerOpen(false)}
          title={`Purchase Order: ${selectedPO.poNumber}`}
          maxWidth="840px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Status: <strong style={{ color: '#7A1F3D' }}>{selectedPO.status}</strong> • Expected: {selectedPO.expectedDelivery}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setIsDetailDrawerOpen(false); handleOpenEdit(selectedPO); }}
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { window.print(); }}
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    handleOpenPreview(selectedPO);
                  }}
                >
                  <FileText size={13} />
                  <span>Download PDF</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    handleOpenEmail(selectedPO);
                  }}
                >
                  <Mail size={13} />
                  <span>Email PO</span>
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Summary Banner */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '14px 18px', 
              background: '#F5E8ED', 
              borderRadius: '6px',
              border: '1px solid var(--border-color)' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#7A1F3D' }}>
                    {selectedPO.poNumber}
                  </h3>
                  <StatusBadge status={selectedPO.status} />
                </div>
                <div style={{ fontSize: '12px', color: '#5A1730', marginTop: '4px' }}>
                  Supplier: <strong>{selectedPO.supplier}</strong> • Issued: {selectedPO.date}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#5A1730', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Value</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#7A1F3D' }}>
                  {selectedPO.formattedTotal || `₹${Number(selectedPO.totalAmount).toLocaleString('en-IN')}`}
                </div>
              </div>
            </div>

            {/* Supplier & Delivery Dossier */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Supplier Details
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedPO.supplier}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>{selectedPO.supplierContact}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedPO.supplierAddress}</div>
                <div style={{ marginTop: '8px', fontSize: '11.5px' }}>
                  <div>Email: <strong style={{ color: '#7A1F3D' }}>{selectedPO.supplierEmail || 'purchase@vendor.com'}</strong></div>
                  <div>GSTIN: <strong className="mono">{selectedPO.supplierGstin || '27AAACS4821M1ZB'}</strong></div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Delivery & Commercial
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                  <div>Expected Delivery: <strong className="mono" style={{ color: '#7A1F3D' }}>{selectedPO.expectedDelivery}</strong></div>
                  <div>Payment Terms: <strong>{selectedPO.paymentTerms || 'Net 30 Days'}</strong></div>
                  <div>Delivery Address: <span style={{ color: 'var(--text-secondary)' }}>{selectedPO.deliveryAddress || 'Plot B-12 Nanded City, Pune'}</span></div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '12px' }}>
                Ordered Spindle Items & Material Specifications
              </div>
              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#ffffff', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>GST</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items && selectedPO.items.map((it, idx) => (
                    <tr key={it.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{it.item || it.name}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{it.desc}</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>
                        {it.qty} {it.unit || 'Pcs'}
                      </td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'right' }}>
                        ₹{Number(it.rate || it.unitPrice || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'center' }}>{it.gst || 18}%</td>
                      <td className="mono" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#7A1F3D' }}>
                        ₹{Number(it.total || (it.qty * it.rate)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '10px 14px', background: 'var(--bg-surface-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '20px', fontSize: '12px' }}>
                <div>Subtotal: <strong className="mono">₹{Number(selectedPO.subtotal || 0).toLocaleString('en-IN')}</strong></div>
                <div>GST (18%): <strong className="mono">₹{Number(selectedPO.gstAmount || 0).toLocaleString('en-IN')}</strong></div>
                <div>Grand Total: <strong className="mono" style={{ color: '#7A1F3D', fontSize: '13px' }}>{selectedPO.formattedTotal || `₹${Number(selectedPO.totalAmount).toLocaleString('en-IN')}`}</strong></div>
              </div>
            </div>

            {/* Notes */}
            {selectedPO.notes && (
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11.5px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Purchase Notes: </span>
                <span style={{ color: 'var(--text-secondary)' }}>{selectedPO.notes}</span>
              </div>
            )}

            {/* Realistic Activity Timeline */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#7A1F3D', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>PO Lifecycle & Activity Timeline</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(selectedPO.timeline && selectedPO.timeline.length > 0 ? selectedPO.timeline : [
                  { id: 1, title: 'PO Created', detail: 'Generated in ERP stores register', time: selectedPO.date, user: 'Ganesh Pawar' },
                  { id: 2, title: 'PO Approved', detail: 'Technical clearance approved by Director', time: selectedPO.date, user: 'V. R. Kulkarni' },
                  { id: 3, title: 'PO Sent', detail: `Sent to ${selectedPO.supplierEmail || 'vendor'}`, time: selectedPO.date, user: 'Rahul Patil' }
                ]).map((t, idx) => (
                  <div key={t.id || idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: '#F5E8ED', 
                      color: '#7A1F3D', 
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
                        {t.detail} • <span style={{ color: '#7A1F3D' }}>{t.user}</span>
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
      {poForEmail && (
        <OutlookEmailComposer 
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          documentData={poForEmail}
          documentType="purchase_order"
          onNotify={onNotify}
          onSendSuccess={(emailRecord) => {
            // Update PO status to 'Sent' if draft
            setPurchaseOrders(prev => prev.map(p => {
              if (p.id === poForEmail.id && p.status === 'Draft') {
                return { ...p, status: 'Sent' };
              }
              return p;
            }));
            onNotify(`Email sent successfully to ${emailRecord.to.join(', ')}`);
          }}
        />
      )}

      {/* DOCUMENT PDF PREVIEW MODAL */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />
    </div>
  );
}
