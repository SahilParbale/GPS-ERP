import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { supplierService } from '../services/database/supplierService';
import { purchaseOrderService } from '../services/database/purchaseOrderService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportVendorDirectoryPdf, exportPurchaseOrderPdf, numberToIndianWords } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import { 
  Search, Truck, Star, Phone, FileText, Plus, Download, 
  RefreshCw, AlertCircle, ShoppingCart, Mail, Eye, Edit3, 
  Trash2, Building2, MapPin, CheckCircle2, DollarSign, 
  ExternalLink, Calendar, Send, Clock, ShieldCheck, Tag
} from 'lucide-react';

export default function SuppliersScreen({ onNavigate, onNotify }) {
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [emailPO, setEmailPO] = useState(null);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);

  // View POs Modal state
  const [selectedVendorForPOs, setSelectedVendorForPOs] = useState(null);
  const [isVendorPOsModalOpen, setIsVendorPOsModalOpen] = useState(false);

  // Add / Edit Vendor Modal state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    supplier_code: '',
    category: '',
    contact_person: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    city: 'Pune',
    state: '27-Maharashtra',
    placeOfSupply: '27-Maharashtra',
    leadTime: '1-2 Weeks',
    lead_time_days: 14,
    rating: 'Grade A+ (99.8% Quality)',
    paymentTerms: 'Due on Receipt',
    status: 'Approved'
  });

  // Delete Confirm Modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    vendor: null
  });

  // Load suppliers and purchase orders simultaneously
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [suppRes, poRes] = await Promise.all([
        supplierService.getSuppliers(),
        purchaseOrderService.getPurchaseOrders()
      ]);

      if (suppRes.error) throw suppRes.error;
      setSuppliers(suppRes.data || []);
      setPurchaseOrders(poRes.data || []);
    } catch (err) {
      console.error('Failed to load vendors/POs:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = (e) => {
      if (e?.detail?.entity === 'suppliers' || e?.detail?.entity === 'purchase-orders') {
        loadData();
      }
    };
    window.addEventListener('gps_entities_updated', handleSync);
    return () => window.removeEventListener('gps_entities_updated', handleSync);
  }, []);

  // Helper to match all POs for a given vendor
  const getVendorPOs = (vendor) => {
    if (!vendor || !purchaseOrders) return [];
    const vName = (vendor.name || '').toLowerCase().trim();
    const vEmail = (vendor.email || '').toLowerCase().trim();
    const vGstin = (vendor.gstin || '').toLowerCase().trim();
    const vCode = (vendor.supplier_code || vendor.id || '').toLowerCase().trim();

    return purchaseOrders.filter(po => {
      const pSupp = (po.supplier || po.supplierName || '').toLowerCase().trim();
      const pEmail = (po.supplierEmail || '').toLowerCase().trim();
      const pGstin = (po.supplierGstin || '').toLowerCase().trim();
      const pSuppId = (po.supplierId || '').toLowerCase().trim();

      return (
        (pSupp && (pSupp.includes(vName) || vName.includes(pSupp))) ||
        (vEmail && pEmail && vEmail === pEmail) ||
        (vGstin && pGstin && vGstin === pGstin) ||
        (vCode && pSuppId && vCode === pSuppId)
      );
    });
  };

  // Dashboard Metrics
  const metrics = useMemo(() => {
    const totalApproved = suppliers.filter(s => s.status !== 'Blacklisted').length;
    const allLinkedPOs = purchaseOrders.filter(p => p.status !== 'Cancelled');
    const totalPoValue = allLinkedPOs.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const sentPOs = purchaseOrders.filter(p => p.status === 'Sent' || p.status === 'Approved').length;

    const formattedVal = totalPoValue >= 100000 
      ? `₹${(totalPoValue / 100000).toFixed(2)}L` 
      : `₹${totalPoValue.toLocaleString('en-IN')}`;

    return {
      totalVendors: suppliers.length,
      totalApproved,
      activePOsCount: allLinkedPOs.length,
      sentPOs,
      totalPoValue: formattedVal,
      avgLeadTime: '14 Days'
    };
  }, [suppliers, purchaseOrders]);

  // Filtered Suppliers list
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q)) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'all' || 
        (s.category && s.category.toLowerCase().includes(categoryFilter.toLowerCase()));

      return matchesSearch && matchesCat;
    });
  }, [suppliers, searchQuery, categoryFilter]);

  // Handle open View POs Modal
  const handleOpenViewPOs = (vendor) => {
    setSelectedVendorForPOs(vendor);
    setIsVendorPOsModalOpen(true);
  };

  // Handle open Add Vendor Modal
  const handleOpenAddVendor = () => {
    setEditingVendorId(null);
    const nextNum = String(suppliers.length + 1).padStart(2, '0');
    setVendorFormData({
      name: '',
      supplier_code: `SUPP-${nextNum}`,
      category: 'Precision Spindle Bearings (P4S / Ceramic)',
      contact_person: '',
      email: '',
      phone: '',
      gstin: '',
      address: '',
      city: 'Pune',
      state: '27-Maharashtra',
      placeOfSupply: '27-Maharashtra',
      leadTime: '1-2 Weeks',
      lead_time_days: 14,
      rating: 'Grade A+ (99.8% Quality)',
      paymentTerms: 'Due on Receipt',
      status: 'Approved'
    });
    setIsVendorModalOpen(true);
  };

  // Handle open Edit Vendor Modal
  const handleOpenEditVendor = (vendor) => {
    setEditingVendorId(vendor.id || vendor.supplier_code);
    setVendorFormData({
      name: vendor.name || '',
      supplier_code: vendor.supplier_code || vendor.id || '',
      category: vendor.category || 'Precision Spindle Bearings & Components',
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      gstin: vendor.gstin || '',
      address: vendor.address || vendor.location || '',
      city: vendor.city || 'Pune',
      state: vendor.state || vendor.placeOfSupply || '27-Maharashtra',
      placeOfSupply: vendor.placeOfSupply || vendor.state || '27-Maharashtra',
      leadTime: vendor.leadTime || '1-2 Weeks',
      lead_time_days: vendor.lead_time_days || 14,
      rating: vendor.rating || 'Grade A (99% Quality)',
      paymentTerms: vendor.paymentTerms || 'Net 30 Days',
      status: vendor.status || 'Approved'
    });
    setIsVendorModalOpen(true);
  };

  // Handle Save Vendor
  const handleSaveVendor = async (e) => {
    e.preventDefault();
    if (!vendorFormData.name.trim()) {
      if (onNotify) onNotify('Vendor Name is required', 'warning');
      return;
    }
    if (!vendorFormData.email.trim()) {
      if (onNotify) onNotify('Vendor Email is required for sending Purchase Orders', 'warning');
      return;
    }

    try {
      if (editingVendorId) {
        await supplierService.updateSupplier(editingVendorId, vendorFormData);
        if (onNotify) onNotify(`Vendor ${vendorFormData.name} updated successfully.`);
      } else {
        await supplierService.createSupplier(vendorFormData);
        if (onNotify) onNotify(`Vendor ${vendorFormData.name} registered and approved.`);
      }
      setIsVendorModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error saving vendor:', err);
      if (onNotify) onNotify('Failed to save vendor record', 'danger');
    }
  };

  // Handle Delete Vendor
  const handleExecuteDeleteVendor = async () => {
    if (!deleteConfirmModal.vendor) return;
    const v = deleteConfirmModal.vendor;
    try {
      await supplierService.deleteSupplier(v.id || v.supplier_code);
      if (onNotify) onNotify(`Vendor ${v.name} removed from registry.`, 'info');
      setDeleteConfirmModal({ isOpen: false, vendor: null });
      await loadData();
    } catch (err) {
      console.error('Error deleting vendor:', err);
      if (onNotify) onNotify('Failed to delete vendor', 'danger');
    }
  };

  if (isLoading) {
    return <TablePageSkeleton columns={['140px', '180px', '160px', '120px', '110px', '110px', '100px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Precision Vendors & Component Suppliers" 
          subtitle="Tier-1 procurement sources for ceramic hybrid bearings, alloy steels, and optical encoders"
          badge="Database Notice"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              Database Operation Notice
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
              {error.message || 'Unable to retrieve live vendor records.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={loadData}>
              <RefreshCw size={14} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Precision Vendors & Component Suppliers" 
        subtitle="Tier-1 procurement sources for ceramic hybrid bearings, alloy steels, and optical encoders"
        badge={`${suppliers.length} Approved Vendors`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => {
            try {
              exportVendorDirectoryPdf(suppliers);
              if (onNotify) onNotify('Exported Approved Vendor Directory (PDF)');
            } catch (e) {
              setPreviewDoc({
                type: 'Report',
                reportTitle: 'APPROVED VENDOR & SUPPLIER DIRECTORY',
                id: `VEND-DIR-${new Date().toISOString().split('T')[0]}`,
                metrics: [
                  { label: 'Approved Vendors', value: suppliers.length },
                  { label: 'Avg Lead Time', value: '14 Days' },
                  { label: 'Quality Rating', value: '99.4% Pass' }
                ],
                headers: ['#', 'Vendor Code', 'Supplier Name', 'Supplied Categories', 'Location', 'Lead Time', 'Rating'],
                rows: suppliers.map((s, idx) => [
                  idx + 1,
                  s.supplier_code || s.id,
                  s.name,
                  s.category,
                  s.location,
                  s.leadTime,
                  s.rating
                ])
              });
              setIsPreviewOpen(true);
            }
          }}
        >
          <Download size={14} />
          <span>Export Vendors (PDF)</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleOpenAddVendor}
        >
          <Plus size={14} />
          <span>+ Add Approved Vendor</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* 4 Metric Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Approved Vendors</span>
              <div className="metric-icon-wrap"><Building2 size={16} /></div>
            </div>
            <div className="metric-value">{metrics.totalApproved}</div>
            <div className="metric-footer" style={{ color: '#176B3A' }}>Qualified & Audit Cleared</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Active Purchase Orders</span>
              <div className="metric-icon-wrap"><ShoppingCart size={16} /></div>
            </div>
            <div className="metric-value">{metrics.activePOsCount}</div>
            <div className="metric-footer" style={{ color: '#7A1F3D' }}>{metrics.sentPOs} Transmitted / Sent</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Procurement Value</span>
              <div className="metric-icon-wrap"><DollarSign size={16} /></div>
            </div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>{metrics.totalPoValue}</div>
            <div className="metric-footer" style={{ color: '#176B3A' }}>Committed Purchase Orders</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Avg Lead Time</span>
              <div className="metric-icon-wrap"><Clock size={16} /></div>
            </div>
            <div className="metric-value">{metrics.avgLeadTime}</div>
            <div className="metric-footer" style={{ color: '#9A6700' }}>Ex-works to Pune Facility</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="section-card">
          <div className="filter-bar">
            <div className="filter-group">
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Search Vendor, Category, GSTIN, Contact..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <CustomSelect 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ minWidth: '180px' }}
                options={[
                  { value: 'all', label: `All Categories (${suppliers.length})` },
                  { value: 'bearing', label: 'Spindle Bearings' },
                  { value: 'steel', label: 'Alloy Metallurgy' },
                  { value: 'drawbar', label: 'Tool Clamping & Drawbars' },
                  { value: 'encoder', label: 'Optical Encoders' }
                ]}
              />
            </div>
          </div>

          {/* Vendors Main Table */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor Name & Code</th>
                  <th>Component Category</th>
                  <th>Location / State</th>
                  <th>Avg Lead Time</th>
                  <th>Quality Rating</th>
                  <th>Linked Purchase Orders</th>
                  <th>Key Contact</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No vendor records found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supp) => {
                    const vendorPOs = getVendorPOs(supp);
                    const totalPOAmount = vendorPOs.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

                    return (
                      <tr key={supp.id || supp.supplier_code}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                            {supp.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span className="mono" style={{ fontSize: '11px', color: '#7A1F3D', fontWeight: 600 }}>
                              {supp.supplier_code || supp.id}
                            </span>
                            {supp.gstin && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                • GST: {supp.gstin}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '12px', maxWidth: '220px' }}>
                          <div style={{ color: 'var(--text-main)', lineHeight: '1.3' }}>
                            {supp.category}
                          </div>
                        </td>
                        <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          <div>{supp.location || supp.city}</div>
                          <div style={{ fontSize: '10.5px', color: '#7A1F3D', fontWeight: 500 }}>
                            POS: {supp.placeOfSupply || supp.state || '27-Maharashtra'}
                          </div>
                        </td>
                        <td className="mono" style={{ fontSize: '12px', fontWeight: 500 }}>
                          {supp.leadTime}
                        </td>
                        <td>
                          <span style={{ 
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: 600,
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            whiteSpace: 'nowrap'
                          }}>
                            {supp.rating}
                          </span>
                        </td>
                        <td>
                          {vendorPOs.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenViewPOs(supp)}
                              style={{ 
                                background: '#F5E8ED', 
                                border: '1px solid #e2ccd5', 
                                borderRadius: '4px', 
                                padding: '3px 7px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'inline-block'
                              }}
                              title="Click to view purchase orders"
                            >
                              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#7A1F3D' }}>
                                {vendorPOs.length} PO{vendorPOs.length > 1 ? 's' : ''} (₹{totalPOAmount.toLocaleString('en-IN')})
                              </div>
                              <div className="mono" style={{ fontSize: '10px', color: '#5A1730' }}>
                                Latest: {vendorPOs[0]?.poNumber || vendorPOs[0]?.id}
                              </div>
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              No orders yet
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '11.5px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {supp.contact_person || supp.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#7A1F3D' }}>
                            {supp.email || 'purchase@vendor.com'}
                          </div>
                          {supp.phone && (
                            <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              {supp.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                            {/* View POs Pop-up Trigger Button */}
                            <button 
                              type="button" 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#7A1F3D', color: '#7A1F3D', fontWeight: 600 }}
                              onClick={() => handleOpenViewPOs(supp)}
                              title={`View all Purchase Orders for ${supp.name}`}
                            >
                              <ShoppingCart size={12} />
                              <span>View POs</span>
                              {vendorPOs.length > 0 && (
                                <span style={{ 
                                  background: '#7A1F3D', 
                                  color: '#ffffff', 
                                  fontSize: '10px', 
                                  borderRadius: '10px', 
                                  padding: '0 5px',
                                  marginLeft: '2px'
                                }}>
                                  {vendorPOs.length}
                                </span>
                              )}
                            </button>

                            {/* Edit Vendor */}
                            <button 
                              type="button" 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 6px' }}
                              onClick={() => handleOpenEditVendor(supp)}
                              title="Edit Vendor Information"
                            >
                              <Edit3 size={12} />
                            </button>

                            {/* Delete Vendor */}
                            <button 
                              type="button" 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 6px', color: 'var(--status-danger-text)' }}
                              onClick={() => setDeleteConfirmModal({ isOpen: true, vendor: supp })}
                              title="Delete Vendor"
                            >
                              <Trash2 size={12} />
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
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW POs POP-UP MODAL (SHOWS ALL POs GENERATED OR SENT TO THIS VENDOR) */}
      {/* ========================================================================= */}
      {selectedVendorForPOs && (
        <Modal
          isOpen={isVendorPOsModalOpen}
          onClose={() => setIsVendorPOsModalOpen(false)}
          title={`Purchase Orders — ${selectedVendorForPOs.name}`}
          maxWidth="920px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Vendor Code: <strong className="mono" style={{ color: '#7A1F3D' }}>{selectedVendorForPOs.supplier_code || selectedVendorForPOs.id}</strong> • GSTIN: <strong className="mono">{selectedVendorForPOs.gstin || '27ABDFP3172C1ZH'}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsVendorPOsModalOpen(false)}
                >
                  Close
                </button>
                {onNavigate && (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => {
                      setIsVendorPOsModalOpen(false);
                      onNavigate('purchase-orders');
                    }}
                    title="Go to Purchase Order Management to generate official PO"
                  >
                    <span>Go to Purchase Orders Screen ↗</span>
                  </button>
                )}
              </div>
            </div>
          }
        >
          {(() => {
            const vPOs = getVendorPOs(selectedVendorForPOs);
            const totalPOVal = vPOs.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
            const sentCount = vPOs.filter(p => p.status === 'Sent' || p.status === 'Approved').length;
            const totalBalance = vPOs.reduce((sum, p) => sum + (Number(p.balance != null ? p.balance : p.totalAmount) || 0), 0);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Vendor Summary Banner */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '12px 16px', 
                  background: '#F5E8ED', 
                  borderRadius: '6px',
                  border: '1px solid #e2ccd5' 
                }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#7A1F3D' }}>
                      {selectedVendorForPOs.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#5A1730', marginTop: '2px' }}>
                      Email: <strong>{selectedVendorForPOs.email}</strong> • Contact: {selectedVendorForPOs.contact_person || selectedVendorForPOs.phone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#5A1730', textTransform: 'uppercase' }}>Total Procurement</div>
                    <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#7A1F3D' }}>
                      ₹{totalPOVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* 4 Mini Metrics for this Vendor */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ padding: '8px 12px', background: '#F8FAF9', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Total Orders</div>
                    <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{vPOs.length}</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#F8FAF9', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Transmitted / Sent</div>
                    <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: '#7A1F3D' }}>{sentCount}</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#F8FAF9', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Total Value</div>
                    <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>₹{totalPOVal.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#F8FAF9', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Outstanding Balance</div>
                    <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: '#7A1F3D' }}>₹{totalBalance.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Orders List Table */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Generated & Sent Purchase Orders</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>{vPOs.length} Record(s)</span>
                  </div>

                  <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#ffffff', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Order No.</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Order Date</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Due Date</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Items Summary</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (₹)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vPOs.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                            <div>No purchase orders found for <strong>{selectedVendorForPOs.name}</strong>.</div>
                            <p style={{ margin: '6px 0 10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                              POs can only be generated and sent from the Purchase Order Management screen.
                            </p>
                            {onNavigate && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setIsVendorPOsModalOpen(false);
                                  onNavigate('purchase-orders');
                                }}
                              >
                                <span>Go to Purchase Order Management ↗</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        vPOs.map((po) => {
                          const itemsSummary = po.items && po.items.length > 0 
                            ? `${po.items[0]?.item || po.items[0]?.name || 'Item'} (${po.items[0]?.qty || 1} ${po.items[0]?.unit || 'Nos'})` + (po.items.length > 1 ? ` +${po.items.length - 1} more` : '')
                            : '120TAC20FME2DBCP5P01-NSK (1 Nos)';

                          return (
                            <tr key={po.id || po.poNumber} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td 
                                className="mono" 
                                style={{ fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', padding: '8px 10px' }}
                                onClick={() => {
                                  setPreviewDoc(po);
                                  setIsPreviewOpen(true);
                                }}
                                title="Click to view Official PDF"
                              >
                                {po.poNumber || po.id}
                              </td>
                              <td className="mono" style={{ padding: '8px 10px', fontSize: '11px' }}>
                                {po.date}
                              </td>
                              <td className="mono" style={{ padding: '8px 10px', fontSize: '11px', color: '#7A1F3D' }}>
                                {po.dueDate || po.expectedDelivery || 'Due on Receipt'}
                              </td>
                              <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                {itemsSummary}
                              </td>
                              <td className="mono" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                                {po.formattedTotal || `₹${Number(po.totalAmount || po.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <StatusBadge status={po.status} />
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', gap: '4px' }}>
                                  {/* Send PO to Supplier */}
                                  <button 
                                    type="button" 
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: '3px 7px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                    onClick={() => {
                                      setEmailPO(po);
                                      setIsEmailComposerOpen(true);
                                    }}
                                    title="Send Official PDF to Supplier via Email"
                                  >
                                    <Mail size={11} />
                                    <span>Send PO</span>
                                  </button>

                                  {/* PDF Preview */}
                                  <button 
                                    type="button" 
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '3px 6px', fontSize: '11px' }}
                                    onClick={() => {
                                      setPreviewDoc(po);
                                      setIsPreviewOpen(true);
                                    }}
                                    title="Preview Official 1:1 PDF"
                                  >
                                    <FileText size={11} />
                                    <span>PDF</span>
                                  </button>

                                  {/* Download Vector PDF */}
                                  <button 
                                    type="button" 
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '3px 5px' }}
                                    onClick={() => {
                                      try {
                                        exportPurchaseOrderPdf(po);
                                        if (onNotify) onNotify(`Downloaded Purchase Order ${po.poNumber || po.id} (PDF)`);
                                      } catch (err) {
                                        console.error('PDF Download failed:', err);
                                      }
                                    }}
                                    title="Download Vector PDF"
                                  >
                                    <Download size={11} />
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
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. ADD / EDIT APPROVED VENDOR MODAL                                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        title={editingVendorId ? `Edit Vendor: ${vendorFormData.name}` : '+ Add Approved Vendor & Component Supplier'}
        maxWidth="750px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Vendors added here are linked directly to the Purchase Order system.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setIsVendorModalOpen(false)}
              >
                Discard
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSaveVendor}
              >
                <CheckCircle2 size={13} />
                <span>{editingVendorId ? 'Save Changes' : 'Approve & Save Vendor'}</span>
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveVendor} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Vendor Details */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
              <Building2 size={14} />
              <span>Vendor Master Information</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Vendor Company Name *</label>
                <input 
                  type="text"
                  className="form-control"
                  value={vendorFormData.name}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. PREMIER INDUSTRIAL SOLUTIONS"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Vendor Code / ID</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={vendorFormData.supplier_code}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, supplier_code: e.target.value }))}
                  placeholder="SUPP-00"
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Component Categories Supplied *</label>
              <input 
                type="text"
                className="form-control"
                value={vendorFormData.category}
                onChange={(e) => setVendorFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Super Precision Angular Contact Bearings, Ceramic Hybrids"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Standard Lead Time</label>
                <input 
                  type="text"
                  className="form-control"
                  value={vendorFormData.leadTime}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, leadTime: e.target.value }))}
                  placeholder="1-2 Weeks"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Quality Rating</label>
                <input 
                  type="text"
                  className="form-control"
                  value={vendorFormData.rating}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, rating: e.target.value }))}
                  placeholder="Grade A+ (99.8% Quality)"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Status</label>
                <select 
                  className="form-control"
                  value={vendorFormData.status}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Approved">Approved</option>
                  <option value="Active">Active</option>
                  <option value="Preferred">Preferred Tier-1</option>
                  <option value="Audit Pending">Audit Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact, PO & Tax Information */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
              <Mail size={14} />
              <span>Purchase Order & Communication Settings</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Vendor Email (Used for Sending POs) *</label>
                <input 
                  type="email"
                  className="form-control"
                  value={vendorFormData.email}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="sales@premierindustrial.in"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Contact Person Name</label>
                <input 
                  type="text"
                  className="form-control"
                  value={vendorFormData.contact_person}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="Mr. Nilesh Deshmukh"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Phone / Contact No.</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={vendorFormData.phone}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0124-4510000"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>GSTIN</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={vendorFormData.gstin}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                  placeholder="27ABDFP3172C1ZH"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Place of Supply / State</label>
                <input 
                  type="text"
                  className="form-control"
                  value={vendorFormData.placeOfSupply}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, placeOfSupply: e.target.value, state: e.target.value }))}
                  placeholder="27-Maharashtra"
                />
              </div>
            </div>
          </div>

          {/* Address & Logistics */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
              <MapPin size={14} />
              <span>Plant / Facility Address</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Full Street / Industrial Address</label>
              <input 
                type="text"
                className="form-control"
                value={vendorFormData.address}
                onChange={(e) => setVendorFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="P-84, D-II BLOCK MIDC Road Pimpri Chinchwad, Pune, Maharashtra-411019, India"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>City / Hub</label>
                <input 
                  type="text"
                  className="form-control"
                  value={vendorFormData.city}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Pune"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Default Payment Terms</label>
                <input 
                  type="text"
                  className="form-control"
                  value={vendorFormData.paymentTerms}
                  onChange={(e) => setVendorFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  placeholder="Due on Receipt"
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 3. DELETE VENDOR CONFIRMATION MODAL                                        */}
      {/* ========================================================================= */}
      {deleteConfirmModal.isOpen && (
        <Modal
          isOpen={deleteConfirmModal.isOpen}
          onClose={() => setDeleteConfirmModal({ isOpen: false, vendor: null })}
          title="Delete Vendor from Approved Registry"
          maxWidth="440px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmModal({ isOpen: false, vendor: null })}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                onClick={handleExecuteDeleteVendor}
              >
                Delete Vendor
              </button>
            </div>
          }
        >
          <div style={{ padding: '4px 0' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-main)' }}>
              Are you sure you want to remove <strong>{deleteConfirmModal.vendor?.name}</strong> from the approved vendor directory?
            </p>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Any linked purchase orders will remain recorded in the procurement register.
            </p>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 5. OUTLOOK EMAIL COMPOSER (TRANSMITTING PO TO SUPPLIER)                   */}
      {/* ========================================================================= */}
      {emailPO && (
        <OutlookEmailComposer 
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          documentData={emailPO}
          documentType="purchase_order"
          onNotify={onNotify}
          onSendSuccess={(emailRecord) => {
            setPurchaseOrders(prev => prev.map(p => {
              if ((p.id === emailPO.id || p.poNumber === emailPO.poNumber) && p.status === 'Draft') {
                return { ...p, status: 'Sent' };
              }
              return p;
            }));
            if (onNotify) onNotify(`Purchase Order sent to ${emailRecord.to.join(', ')}`);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. DOCUMENT PREVIEW MODAL (OFFICIAL 1:1 REPLICA OF PO / DIRECTORY)         */}
      {/* ========================================================================= */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />
    </div>
  );
}
