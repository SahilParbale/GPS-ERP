import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { purchaseOrderService } from '../services/database/purchaseOrderService';
import { supplierService } from '../services/database/supplierService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportPurchaseOrderPdf, exportPurchaseOrderRegisterPdf, numberToIndianWords } from '../utils/pdfGenerator';
import { 
  Search, Plus, Eye, Printer, FileText, Send, 
  Download, Trash2, Edit3, Check, X, Building2, 
  User, Phone, MapPin, Mail, Clock, ShoppingCart, 
  CheckCircle2, AlertCircle, Calendar, DollarSign,
  ChevronRight, ArrowRight, ShieldCheck, Truck, RefreshCw
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import ConfirmActionModal from '../components/common/ConfirmActionModal';

const PRESET_SUPPLIERS = [
  {
    name: 'PREMIER INDUSTRIAL SOLUTIONS',
    code: 'SUPP-00',
    category: 'Super Precision Spindle Bearings (NSK)',
    contact: '0124-4510000',
    email: 'sales@premierindustrial.in',
    phone: '0124-4510000',
    gstin: '27ABDFP3172C1ZH',
    address: 'P-84, D-II BLOCK MIDC Road Pimpri Chinchwad, Pune, Maharashtra-411019, India',
    placeOfSupply: '27-Maharashtra',
    state: '27-Maharashtra',
    paymentTerms: 'Due on Receipt'
  },
  {
    name: 'Schaeffler India',
    code: 'SUPP-01',
    category: 'High-Precision Angular Contact Spindle Bearings',
    contact: 'Mr. Rajesh Nair (Sales Director - Spindle Bearings)',
    email: 'r.nair@schaeffler.com',
    phone: '+91 20 6608 4100',
    gstin: '27AAACS4821M1ZB',
    address: 'Pune Distribution Centre, Chakan MIDC Phase II, Pune - 410501, Maharashtra',
    placeOfSupply: '27-Maharashtra',
    state: '27-Maharashtra',
    paymentTerms: 'Net 30 Days'
  },
  {
    name: 'Bharat Special Steel',
    code: 'SUPP-02',
    category: 'Alloy Metallurgy & Case Hardened Tool Steels',
    contact: 'Mr. Manoj Gokhale (Head - Alloy Metallurgy)',
    email: 'sales@bharatspecialsteel.com',
    phone: '+91 20 2712 9182',
    gstin: '27AABCB9182L1ZX',
    address: 'Plot 42, Bhosari Industrial Area, Pune - 411026, Maharashtra',
    placeOfSupply: '27-Maharashtra',
    state: '27-Maharashtra',
    paymentTerms: 'Net 30 Days'
  },
  {
    name: 'OTT Jakob',
    code: 'SUPP-03',
    category: 'Automatic Tool Clamping Systems & Rotary Joints',
    contact: 'Mr. K. S. Raman (Country Applications Manager)',
    email: 'raman@ottjakob-india.com',
    phone: '+91 80 4112 0900',
    gstin: '29AAACJ3918K1Z3',
    address: 'Bengaluru Technology Centre, 4th Phase, Peenya Industrial Area, Bengaluru - 560058',
    placeOfSupply: '29-Karnataka',
    state: '29-Karnataka',
    paymentTerms: 'Net 45 Days'
  },
  {
    name: 'Heidenhain India',
    code: 'SUPP-04',
    category: 'Optical Encoders & Precision Linear Glass Scales',
    contact: 'Mr. Suresh Babu (Regional Head)',
    email: 'info@heidenhain.in',
    phone: '+91 22 2831 4910',
    gstin: '27AABCH4910D1Z7',
    address: 'Tech Park, Andheri East, Mumbai - 400069, Maharashtra',
    placeOfSupply: '27-Maharashtra',
    state: '27-Maharashtra',
    paymentTerms: 'Net 30 Days'
  },
  {
    name: 'Sandvik Coromant India',
    code: 'SUPP-05',
    category: 'Carbide Tooling & Spindle Collets',
    contact: 'Ms. Priya Sharma (Key Accounts)',
    email: 'orders@sandvik.com',
    phone: '+91 20 6734 5000',
    gstin: '27AAACS1928F1ZG',
    address: 'Mumbai-Pune Road, Dapodi, Pune - 411012, Maharashtra',
    placeOfSupply: '27-Maharashtra',
    state: '27-Maharashtra',
    paymentTerms: 'Net 30 Days'
  }
];

export default function PurchaseOrderScreen({ onNavigate, onNotify }) {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [availableSuppliers, setAvailableSuppliers] = useState(PRESET_SUPPLIERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadSuppliers = async () => {
    try {
      const res = await supplierService.getSuppliers();
      if (res.data && res.data.length > 0) {
        const map = new Map();
        PRESET_SUPPLIERS.forEach(ps => map.set(ps.name.toLowerCase().trim(), ps));
        res.data.forEach(s => {
          map.set(s.name.toLowerCase().trim(), {
            name: s.name,
            code: s.supplier_code || s.id || '',
            category: s.category || '',
            contact: s.contact_person || s.contact || '',
            email: s.email || '',
            phone: s.phone || '',
            gstin: s.gstin || '',
            address: s.address || s.location || '',
            placeOfSupply: s.placeOfSupply || s.state || '27-Maharashtra',
            state: s.state || s.placeOfSupply || '27-Maharashtra',
            paymentTerms: s.paymentTerms || 'Due on Receipt'
          });
        });
        setAvailableSuppliers(Array.from(map.values()));
      }
    } catch (e) {
      console.warn('Could not load dynamic suppliers in PO Screen:', e);
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await purchaseOrderService.getPurchaseOrders();
      if (res.error) throw res.error;
      setPurchaseOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load purchase orders from live database:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
    loadSuppliers();

    const handleSync = (e) => {
      if (e?.detail?.entity === 'suppliers') {
        loadSuppliers();
      } else if (e?.detail?.entity === 'purchase-orders') {
        loadPurchaseOrders();
      }
    };
    window.addEventListener('gps_entities_updated', handleSync);
    return () => window.removeEventListener('gps_entities_updated', handleSync);
  }, []);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPOId, setEditingPOId] = useState(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Email and Document Preview
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [poForEmail, setPoForEmail] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Rich Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'cancel',
    po: null,
    isLoading: false
  });

  // Form State for Create / Edit PO matching official PDF format
  const [formData, setFormData] = useState({
    poNumber: 'PO/2025-26/00106',
    supplier: 'PREMIER INDUSTRIAL SOLUTIONS',
    supplierContact: '0124-4510000',
    supplierEmail: 'sales@premierindustrial.in',
    supplierPhone: '0124-4510000',
    supplierGstin: '27ABDFP3172C1ZH',
    supplierAddress: 'P-84, D-II BLOCK MIDC Road Pimpri Chinchwad, Pune, Maharashtra-411019, India',
    placeOfSupply: '27-Maharashtra',
    poDate: '04-09-2026',
    expectedDelivery: '04-09-2026',
    paymentTerms: 'Due on Receipt',
    deliveryAddress: 'SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041',
    notes: 'Thanks for doing business with us!',
    termsAndConditions: 'Thanks for doing business with us!',
    advance: 0,
    items: [
      { id: 1, item: '120TAC20FME2DBCP5P01-NSK', desc: '120TAC20FME2DBCP5P01-NSK', hsn: '84821012', qty: 1, unit: 'Nos', rate: 58262, gst: 18 }
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
        (po.poNumber && po.poNumber.toLowerCase().includes(q)) ||
        (po.supplier && po.supplier.toLowerCase().includes(q)) ||
        (po.placeOfSupply && po.placeOfSupply.toLowerCase().includes(q)) ||
        (po.supplierGstin && po.supplierGstin.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [purchaseOrders, searchQuery, statusFilter]);

  // Handle supplier change in form
  const handleSupplierSelect = (supplierName) => {
    const matched = availableSuppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase() || s.name === supplierName);
    if (matched) {
      setFormData(prev => ({
        ...prev,
        supplier: matched.name,
        supplierContact: matched.contact || matched.phone,
        supplierEmail: matched.email,
        supplierPhone: matched.phone || matched.contact,
        supplierGstin: matched.gstin,
        supplierAddress: matched.address,
        placeOfSupply: matched.placeOfSupply || '27-Maharashtra',
        paymentTerms: matched.paymentTerms || prev.paymentTerms || 'Due on Receipt'
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
        { id: Date.now(), item: '', desc: '', hsn: '84821012', qty: 1, unit: 'Nos', rate: 0, gst: 18 }
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

  // Live item totals and GST calculations matching official PDF format
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

    const rawTotal = subtotal + gst;
    const grandTotal = Math.round(rawTotal);
    const roundOff = Number((grandTotal - rawTotal).toFixed(2));
    const advance = Number(formData.advance) || 0;
    const balance = grandTotal - advance;
    const words = numberToIndianWords ? numberToIndianWords(grandTotal) : '';

    return { 
      subtotal, 
      gst: Math.round(gst * 100) / 100, 
      cgst: Math.round(gst * 50) / 100,
      sgst: Math.round(gst * 50) / 100,
      roundOff, 
      grandTotal, 
      advance, 
      balance, 
      words 
    };
  }, [formData.items, formData.advance]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPOId(null);
    const randNum = String(Math.floor(100 + Math.random() * 900)).padStart(5, '0');
    const todayStr = '04-09-2026';
    setFormData({
      poNumber: `PO/2025-26/${randNum}`,
      supplier: 'PREMIER INDUSTRIAL SOLUTIONS',
      supplierContact: '0124-4510000',
      supplierEmail: 'sales@premierindustrial.in',
      supplierPhone: '0124-4510000',
      supplierGstin: '27ABDFP3172C1ZH',
      supplierAddress: 'P-84, D-II BLOCK MIDC Road Pimpri Chinchwad, Pune, Maharashtra-411019, India',
      placeOfSupply: '27-Maharashtra',
      poDate: todayStr,
      expectedDelivery: todayStr,
      paymentTerms: 'Due on Receipt',
      deliveryAddress: 'SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041',
      notes: 'Thanks for doing business with us!',
      termsAndConditions: 'Thanks for doing business with us!',
      advance: 0,
      items: [
        { id: 1, item: '120TAC20FME2DBCP5P01-NSK', desc: '120TAC20FME2DBCP5P01-NSK', hsn: '84821012', qty: 1, unit: 'Nos', rate: 58262, gst: 18 }
      ]
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (po) => {
    setEditingPOId(po.id || po.poNumber);
    setFormData({
      poNumber: po.poNumber || po.id,
      supplier: po.supplier,
      supplierContact: po.supplierContact || '',
      supplierEmail: po.supplierEmail || '',
      supplierPhone: po.supplierPhone || '',
      supplierGstin: po.supplierGstin || '',
      supplierAddress: po.supplierAddress || '',
      placeOfSupply: po.placeOfSupply || '27-Maharashtra',
      poDate: po.date,
      expectedDelivery: po.dueDate || po.expectedDelivery,
      paymentTerms: po.paymentTerms || 'Due on Receipt',
      deliveryAddress: po.deliveryAddress || 'SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041',
      notes: po.notes || 'Thanks for doing business with us!',
      termsAndConditions: po.termsAndConditions || po.notes || 'Thanks for doing business with us!',
      advance: po.advance || 0,
      items: po.items && po.items.length > 0 ? po.items.map(it => ({
        id: it.id || Math.random(),
        item: it.item || it.name,
        desc: it.desc || '',
        hsn: it.hsn || it.hsn_code || '84821012',
        qty: it.qty != null ? it.qty : 1,
        unit: it.unit || 'Nos',
        rate: it.rate != null ? it.rate : (it.unitPrice || 0),
        gst: it.gst || 18
      })) : [{ id: 1, item: '120TAC20FME2DBCP5P01-NSK', desc: '', hsn: '84821012', qty: 1, unit: 'Nos', rate: 58262, gst: 18 }]
    });
    setIsCreateModalOpen(true);
  };

  // Save or Send PO
  const handleSavePO = async (targetStatus = 'Draft', andSend = false) => {
    if (!formData.supplier.trim()) {
      onNotify('Please specify a supplier name', 'danger');
      return;
    }

    try {
      const payload = {
        poNumber: formData.poNumber,
        supplierName: formData.supplier,
        supplierContact: formData.supplierContact,
        supplierEmail: formData.supplierEmail,
        supplierPhone: formData.supplierPhone,
        supplierGstin: formData.supplierGstin,
        supplierAddress: formData.supplierAddress,
        placeOfSupply: formData.placeOfSupply || '27-Maharashtra',
        poDate: formData.poDate,
        dueDate: formData.expectedDelivery,
        expectedDeliveryDate: formData.expectedDelivery,
        paymentTerms: formData.paymentTerms,
        subtotal: formTotals.subtotal,
        taxRate: 18,
        gstAmount: formTotals.gst,
        roundOff: formTotals.roundOff,
        totalAmount: formTotals.grandTotal,
        advance: formTotals.advance,
        balance: formTotals.balance,
        status: andSend ? 'Sent' : targetStatus,
        notes: formData.notes,
        termsAndConditions: formData.termsAndConditions || 'Thanks for doing business with us!',
        items: formData.items.map(it => ({
          item: it.item || it.desc || '120TAC20FME2DBCP5P01-NSK',
          desc: it.desc || it.item,
          hsn: it.hsn || '84821012',
          qty: Number(it.qty) || 1,
          unit: it.unit || 'Nos',
          rate: Number(it.rate) || 0,
          gst: Number(it.gst) || 18,
          total: (Number(it.qty) || 1) * (Number(it.rate) || 0)
        }))
      };

      let activePoRecord = null;
      if (editingPOId) {
        const res = await purchaseOrderService.updatePurchaseOrder(editingPOId, payload);
        if (res.error) throw res.error;
        activePoRecord = res.data;
        onNotify(`Purchase Order ${editingPOId} updated successfully.`);
      } else {
        const res = await purchaseOrderService.createPurchaseOrder(payload);
        if (res.error) throw res.error;
        activePoRecord = res.data?.[0] || res.data;
        onNotify(`Purchase Order ${payload.poNumber} created successfully.`);
      }

      await loadPurchaseOrders();
      setIsCreateModalOpen(false);

      if (andSend) {
        const poToSend = activePoRecord || {
          ...formData,
          id: formData.poNumber,
          totalAmount: formTotals.grandTotal,
          subtotal: formTotals.subtotal,
          gstAmount: formTotals.gst,
          status: 'Sent'
        };
        handleOpenEmail(poToSend);
      }
    } catch (err) {
      console.error('Error saving Purchase Order:', err);
      onNotify(err.message || 'Failed to save Purchase Order', 'danger');
    }
  };

  // Preview directly from create/edit modal before saving
  const handlePreviewCurrentForm = () => {
    const previewPayload = {
      id: formData.poNumber || 'PO/2025-26/00106',
      poNumber: formData.poNumber || 'PO/2025-26/00106',
      supplier: formData.supplier,
      supplierContact: formData.supplierContact,
      supplierEmail: formData.supplierEmail,
      supplierPhone: formData.supplierPhone,
      supplierGstin: formData.supplierGstin,
      supplierAddress: formData.supplierAddress,
      placeOfSupply: formData.placeOfSupply || '27-Maharashtra',
      date: formData.poDate,
      dueDate: formData.expectedDelivery,
      expectedDelivery: formData.expectedDelivery,
      paymentTerms: formData.paymentTerms,
      subtotal: formTotals.subtotal,
      taxRate: 18,
      gstAmount: formTotals.gst,
      roundOff: formTotals.roundOff,
      totalAmount: formTotals.grandTotal,
      advance: formTotals.advance,
      balance: formTotals.balance,
      amountInWords: formTotals.words,
      termsAndConditions: formData.termsAndConditions || formData.notes || 'Thanks for doing business with us!',
      notes: formData.notes,
      items: formData.items.map((it, idx) => ({
        id: it.id || idx + 1,
        item: it.item || '120TAC20FME2DBCP5P01-NSK',
        name: it.item || '120TAC20FME2DBCP5P01-NSK',
        desc: it.desc || it.item,
        hsn: it.hsn || '84821012',
        qty: Number(it.qty) || 1,
        unit: it.unit || 'Nos',
        rate: Number(it.rate) || 0,
        unitPrice: Number(it.rate) || 0,
        gst: Number(it.gst) || 18,
        total: (Number(it.qty) || 1) * (Number(it.rate) || 0)
      }))
    };
    setPreviewDoc(previewPayload);
    setIsPreviewOpen(true);
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

  const handlePromptCancelPO = (po) => {
    setConfirmModal({
      isOpen: true,
      type: 'cancel',
      po: po,
      isLoading: false
    });
  };

  const handlePromptDeletePO = (po) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      po: po,
      isLoading: false
    });
  };

  const handleExecuteConfirm = async () => {
    if (!confirmModal.po) return;
    const po = confirmModal.po;
    const poId = po.id || po.poNumber;
    const poNum = po.poNumber || po.id;
    const isDelete = confirmModal.type === 'delete';

    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    if (isDelete) {
      try {
        // Optimistic remove
        setPurchaseOrders(prev => prev.filter(p => p.id !== poId && p.poNumber !== poId));
        if (selectedPO && (selectedPO.id === poId || selectedPO.poNumber === poId)) {
          setIsDetailDrawerOpen(false);
          setSelectedPO(null);
        }

        const res = await purchaseOrderService.deletePurchaseOrder(poId);
        if (res.error) throw res.error;

        onNotify(`Purchase Order ${poNum} permanently deleted.`, 'info');
        setConfirmModal({ isOpen: false, type: 'delete', po: null, isLoading: false });
        await loadPurchaseOrders();
      } catch (err) {
        console.error('Error deleting PO:', err);
        onNotify(err.message || 'Failed to delete Purchase Order', 'danger');
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
        await loadPurchaseOrders();
      }
    } else {
      try {
        // Optimistic status update
        setPurchaseOrders(prev => prev.map(p => 
          (p.id === poId || p.poNumber === poId) ? { ...p, status: 'Cancelled' } : p
        ));
        if (selectedPO && (selectedPO.id === poId || selectedPO.poNumber === poId)) {
          setSelectedPO(prev => ({ ...prev, status: 'Cancelled' }));
        }

        const res = await purchaseOrderService.updatePurchaseOrderStatus(poId, 'Cancelled');
        if (res.error) throw res.error;

        onNotify(`Purchase Order ${poNum} marked as Cancelled.`, 'warning');
        setConfirmModal({ isOpen: false, type: 'cancel', po: null, isLoading: false });
        await loadPurchaseOrders();
      } catch (err) {
        console.error('Error cancelling PO:', err);
        onNotify(err.message || 'Failed to cancel Purchase Order', 'danger');
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
        await loadPurchaseOrders();
      }
    }
  };

  if (isLoading) {
    return <TablePageSkeleton hasMetrics={true} metricCount={3} columns={['100px', '160px', '140px', '100px', '90px', '90px', '80px', '70px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Purchase Order Management" 
          subtitle="Manage precision spindle components, alloy forgings, and vendor orders"
          badge="Database Notice"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
              {error.message || 'Unable to retrieve purchase orders from PostgreSQL database.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={loadPurchaseOrders}>
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
        title="Purchase Order Management" 
        subtitle="Manage precision spindle components, alloy forgings, and vendor orders"
        badge={`${purchaseOrders.length} Purchase Orders`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => {
            setPreviewDoc({
              type: 'Report',
              reportTitle: 'PURCHASE ORDER PROCUREMENT & VENDOR REGISTER',
              id: `PO-REG-${new Date().toISOString().split('T')[0]}`,
              metrics: [
                { label: 'Total Purchase Orders', value: purchaseOrders.length },
                { label: 'Approved & Active', value: purchaseOrders.filter(p => p.status === 'Approved' || p.status === 'Sent').length },
                { label: 'Pending Delivery', value: purchaseOrders.filter(p => p.status !== 'Delivered' && p.status !== 'Cancelled').length }
              ],
              headers: ['#', 'PO Number', 'Supplier / Vendor', 'Expected Delivery', 'Payment Terms', 'Total Value', 'Status'],
              rows: purchaseOrders.map((po, idx) => [
                idx + 1,
                po.id || po.poNumber,
                po.supplier,
                po.expectedDelivery || '14 Days',
                po.paymentTerms || 'Net 30',
                `₹${Number(po.totalAmount || po.amount || 0).toLocaleString('en-IN')}`,
                po.status
              ])
            });
            setIsPreviewOpen(true);
          }}
        >
          <Download size={14} />
          <span>Export POs (PDF)</span>
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

      <div className="content-body">

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

            <CustomSelect 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '170px' }}
              options={[
                { value: 'all', label: `All Statuses (${purchaseOrders.length})` },
                { value: 'draft', label: 'Draft' },
                { value: 'approved', label: 'Approved' },
                { value: 'sent', label: 'Sent' },
                { value: 'received', label: 'Received' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Supplier / Order To</th>
                <th>PO Date / Due Date</th>
                <th>Place of Supply</th>
                <th>Total Value</th>
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
                  <tr key={po.id || po.poNumber}>
                    <td 
                      className="mono" 
                      style={{ fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}
                      onClick={() => handleOpenPreview(po)}
                      title="Click to view Official Purchase Order PDF"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{po.poNumber || po.id}</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 400 }}>
                        {po.items ? `${po.items.length} line item(s)` : '1 line item'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{po.supplier}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {po.supplierGstin ? `GSTIN: ${po.supplierGstin}` : (po.supplierContact || po.supplierEmail)}
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 600 }}>{po.date}</div>
                      <div style={{ fontSize: '10.5px', color: '#7A1F3D' }}>
                        Due: {po.dueDate || po.expectedDelivery || 'Due on Receipt'}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ fontSize: '11px', background: '#F8FAF9', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        {po.placeOfSupply || '27-Maharashtra'}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      <div>{po.formattedTotal || `₹${Number(po.totalAmount || po.grandTotal || 0).toLocaleString('en-IN')}`}</div>
                      {po.balance != null && po.advance > 0 && (
                        <div style={{ fontSize: '10px', color: '#7A1F3D', fontWeight: 500 }}>
                          Bal: ₹{Number(po.balance).toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={po.status} />
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleOpenEmail(po)}
                          title="Send Official PO PDF to Supplier via Email"
                        >
                          <Mail size={12} />
                          <span>Send PO</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 7px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleOpenPreview(po)}
                          title="Preview Official 1:1 PDF"
                        >
                          <FileText size={12} />
                          <span>PDF</span>
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 6px' }}
                          onClick={() => {
                            try {
                              exportPurchaseOrderPdf(po);
                              if (onNotify) onNotify(`Downloaded Purchase Order ${po.poNumber || po.id} (PDF)`, 'info');
                            } catch (e) {
                              console.error(e);
                              if (onNotify) onNotify('Failed to generate PDF', 'danger');
                            }
                          }}
                          title="Download Vector PDF"
                        >
                          <Download size={12} />
                        </button>
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
                        {po.status !== 'Cancelled' && po.status !== 'Received' && (
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 6px', color: '#6F6267' }}
                            onClick={() => handlePromptCancelPO(po)}
                            title="Cancel PO"
                          >
                            <X size={12} />
                          </button>
                        )}
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 6px', color: 'var(--status-danger-text)' }}
                          onClick={() => handlePromptDeletePO(po)}
                          title="Delete PO"
                        >
                          <Trash2 size={12} />
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

      {/* CREATE / EDIT PO MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingPOId ? `Edit Purchase Order: ${editingPOId}` : "+ Create Purchase Order (Official GST Format)"}
        maxWidth="960px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Total PO Value: <strong className="mono" style={{ color: '#7A1F3D', fontSize: '15px' }}>₹{formTotals.grandTotal.toLocaleString('en-IN')}</strong> (Incl. GST)
              </div>
              {formTotals.words && (
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '380px' }}>
                  {formTotals.words}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={handlePreviewCurrentForm}
                title="Preview 1:1 replica of official PDF"
              >
                <FileText size={13} />
                <span>Preview Official PO (PDF)</span>
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={() => handleSavePO('Sent', true)}
              >
                <Send size={13} />
                <span>Save & Send PO to Supplier</span>
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSavePO('Sent', true); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* GPS Letterhead Banner */}
          <div style={{ 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px', 
            padding: '10px 14px', 
            background: '#F8FAF9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#7A1F3D', fontSize: '13px' }}>GENERAL PRECISION SPINDLES</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div>GSTIN: <strong className="mono">27AABCG1234F1ZP</strong></div>
              <div>State: <strong>27-Maharashtra</strong></div>
            </div>
          </div>

          {/* Top 2-Column Grid: Left Order To (Supplier) & Right Order Metadata (2x2 Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            {/* Left: Supplier / Order To Box */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                <Building2 size={14} />
                <span>Order To (Supplier Details)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Prominent Vendor / Supplier Selection Dropdown */}
                <div style={{ 
                  background: '#F5E8ED', 
                  border: '1px solid #e2ccd5', 
                  borderRadius: '6px', 
                  padding: '10px 12px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#7A1F3D', margin: 0 }}>
                      Select Vendor from Approved Registry *
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#5A1730', fontWeight: 600 }}>
                      {availableSuppliers.length} Registered Suppliers
                    </span>
                  </div>

                  <select 
                    className="form-control"
                    style={{ 
                      fontWeight: 600, 
                      color: '#7A1F3D', 
                      backgroundColor: '#ffffff', 
                      borderColor: '#7A1F3D', 
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    value={availableSuppliers.some(s => s.name === formData.supplier) ? formData.supplier : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSupplierSelect(e.target.value);
                      }
                    }}
                  >
                    <option value="">-- Choose Approved Vendor to Generate PO --</option>
                    {availableSuppliers.map((s, idx) => (
                      <option key={s.code || s.name || idx} value={s.name}>
                        {s.name} {s.code ? `[${s.code}]` : ''} {s.category ? `• ${s.category}` : ''}
                      </option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#5A1730' }}>
                      💡 Selecting an approved vendor auto-fills contact, email, GSTIN, and delivery address.
                    </span>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateModalOpen(false);
                          onNavigate('suppliers');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#7A1F3D',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0
                        }}
                      >
                        Manage Vendors ↗
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Supplier / Vendor Name *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={formData.supplier}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    placeholder="e.g. PREMIER INDUSTRIAL SOLUTIONS"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '10.5px' }}>Supplier Email (For Sending PO) *</label>
                    <input 
                      type="email"
                      className="form-control"
                      value={formData.supplierEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierEmail: e.target.value }))}
                      placeholder="sales@supplier.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '10.5px' }}>Contact No.</label>
                    <input 
                      type="text"
                      className="form-control mono"
                      value={formData.supplierPhone || formData.supplierContact}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierPhone: e.target.value, supplierContact: e.target.value }))}
                      placeholder="0124-4510000"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '10.5px' }}>Address</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={formData.supplierAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                      placeholder="P-84, D-II BLOCK MIDC Road Pimpri Chinchwad, Pune..."
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '10.5px' }}>GSTIN</label>
                    <input 
                      type="text"
                      className="form-control mono"
                      value={formData.supplierGstin}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierGstin: e.target.value.toUpperCase() }))}
                      placeholder="27ABDFP3172C1ZH"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Order Metadata 2x2 Grid (matching PDF layout) */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                <Truck size={14} />
                <span>PO Commercial & Delivery Terms</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Order No.</label>
                  <input 
                    type="text"
                    className="form-control mono"
                    value={formData.poNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                    placeholder="PO/2025-26/00106"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Date</label>
                  <input 
                    type="text"
                    className="form-control mono"
                    value={formData.poDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, poDate: e.target.value }))}
                    placeholder="04-09-2025"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Due Date:</label>
                  <input 
                    type="text"
                    className="form-control mono"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                    placeholder="04-09-2025 or 14 Days"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Place of supply</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={formData.placeOfSupply}
                    onChange={(e) => setFormData(prev => ({ ...prev, placeOfSupply: e.target.value }))}
                    placeholder="27-Maharashtra"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Payment Terms</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="Due on Receipt"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Delivery Address</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    placeholder="Nanded Phata, Pune-411041"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table (matching PDF Table: #, Item name, HSN/ SAC, Quantity, Unit, Price/ Unit, Amount) */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '12px', color: '#7A1F3D' }}>
                Ordered Items & HSN/SAC Codes
              </span>
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
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 4px', width: '30px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '6px 6px', textAlign: 'left' }}>Item name</th>
                    <th style={{ padding: '6px 6px', width: '110px', textAlign: 'left' }}>HSN/ SAC</th>
                    <th style={{ padding: '6px 6px', width: '70px', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '6px 6px', width: '65px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '6px 6px', width: '110px', textAlign: 'right' }}>Price/ Unit (₹)</th>
                    <th style={{ padding: '6px 6px', width: '65px', textAlign: 'center' }}>GST%</th>
                    <th style={{ padding: '6px 6px', width: '110px', textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ padding: '6px 4px', width: '30px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((it, idx) => {
                    const lineTotal = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                    return (
                      <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '28px', fontSize: '11px', fontWeight: 600 }}
                            value={it.item} 
                            onChange={(e) => handleItemChange(it.id, 'item', e.target.value)}
                            placeholder="e.g. 120TAC20FME2DBCP5P01-NSK"
                            required
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11px' }}
                            value={it.hsn || '84821012'} 
                            onChange={(e) => handleItemChange(it.id, 'hsn', e.target.value)}
                            placeholder="84821012"
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            min="1"
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11px', textAlign: 'center' }}
                            value={it.qty} 
                            onChange={(e) => handleItemChange(it.id, 'qty', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <select 
                            className="form-control"
                            style={{ height: '28px', fontSize: '11px', padding: '0 4px' }}
                            value={it.unit || 'Nos'}
                            onChange={(e) => handleItemChange(it.id, 'unit', e.target.value)}
                          >
                            <option value="Nos">Nos</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Pairs">Pairs</option>
                            <option value="Sets">Sets</option>
                            <option value="Kg">Kg</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            min="0"
                            step="any"
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11px', textAlign: 'right' }}
                            value={it.rate} 
                            onChange={(e) => handleItemChange(it.id, 'rate', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <select 
                            className="form-control mono"
                            style={{ height: '28px', fontSize: '11px', padding: '0 4px' }}
                            value={it.gst != null ? it.gst : 18}
                            onChange={(e) => handleItemChange(it.id, 'gst', Number(e.target.value))}
                          >
                            <option value={18}>18%</option>
                            <option value={12}>12%</option>
                            <option value={28}>28%</option>
                            <option value={5}>5%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>
                        <td className="mono" style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 600 }}>
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItem(it.id)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            title="Remove item"
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

            {/* Split Financial Section matching PDF (Order Amount in Words on left; Amounts on right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              {/* Left Column: Words & Terms */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '8px 10px', background: '#F8FAF9', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Order Amount in Words
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#7A1F3D', marginTop: '2px', lineHeight: '1.3' }}>
                    {formTotals.words || 'Zero Only'}
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '10.5px' }}>Terms and conditions</label>
                  <textarea 
                    className="form-control"
                    rows={2}
                    value={formData.termsAndConditions || formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value, notes: e.target.value }))}
                    placeholder="Thanks for doing business with us!"
                  />
                </div>
              </div>

              {/* Right Column: PDF-Matching Amounts Grid */}
              <div style={{ background: '#F8FAF9', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sub Total</span>
                  <span className="mono">₹{formTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tax (18% GST)</span>
                  <span className="mono">₹{formTotals.gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6F6267' }}>
                  <span>Round off</span>
                  <span className="mono">{formTotals.roundOff >= 0 ? `+₹${formTotals.roundOff.toFixed(2)}` : `-₹${Math.abs(formTotals.roundOff).toFixed(2)}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 800, color: '#7A1F3D', fontSize: '13px' }}>
                  <span>Total</span>
                  <span className="mono">₹{formTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Advance (₹)</span>
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    className="form-control mono"
                    style={{ height: '24px', width: '90px', fontSize: '11px', textAlign: 'right', padding: '2px 4px' }}
                    value={formData.advance}
                    onChange={(e) => setFormData(prev => ({ ...prev, advance: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-main)', fontSize: '12px' }}>
                  <span>Balance</span>
                  <span className="mono">₹{formTotals.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Live HSN Tax Breakdown Box matching PDF */}
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                HSN / SAC Tax Structure (9% CGST + 9% SGST)
              </div>
              <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse', background: '#fafafa', border: '1px solid var(--border-color)' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '4px 6px', textAlign: 'left' }}>HSN/ SAC</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Taxable amount</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>CGST (9%)</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>SGST (9%)</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="mono" style={{ padding: '4px 6px' }}>{formData.items[0]?.hsn || '84821012'}</td>
                    <td className="mono" style={{ padding: '4px 6px', textAlign: 'right' }}>₹{formTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="mono" style={{ padding: '4px 6px', textAlign: 'right' }}>₹{formTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="mono" style={{ padding: '4px 6px', textAlign: 'right' }}>₹{formTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="mono" style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>₹{formTotals.gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </Modal>

      {/* PURCHASE ORDER DETAIL MODAL / DRAWER */}
      {selectedPO && (
        <Modal
          isOpen={isDetailDrawerOpen}
          onClose={() => setIsDetailDrawerOpen(false)}
          title={`Purchase Order: ${selectedPO.poNumber || selectedPO.id}`}
          maxWidth="880px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Status: <strong style={{ color: '#7A1F3D' }}>{selectedPO.status}</strong> • Due: {selectedPO.dueDate || selectedPO.expectedDelivery || 'Due on Receipt'}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                  onClick={() => handleOpenPreview(selectedPO)}
                  title="Open Official PDF Pop-up Replica"
                >
                  <FileText size={13} />
                  <span>Preview PDF</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    try {
                      exportPurchaseOrderPdf(selectedPO);
                      if (onNotify) onNotify(`Purchase Order ${selectedPO.poNumber || selectedPO.id} downloaded (PDF)`);
                    } catch (err) {
                      console.error('Failed to download PO PDF:', err);
                      if (onNotify) onNotify('Failed to download PO PDF', 'danger');
                    }
                  }}
                  title="Download Vector PDF"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    try {
                      window.print();
                      if (onNotify) onNotify(`Print dialog opened for Purchase Order ${selectedPO.poNumber || selectedPO.id}`);
                    } catch (err) {
                      console.error('Failed to print PO:', err);
                    }
                  }}
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                {selectedPO.status !== 'Cancelled' && selectedPO.status !== 'Received' && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ color: '#6F6267' }}
                    onClick={() => handlePromptCancelPO(selectedPO)}
                  >
                    <X size={13} />
                    <span>Cancel PO</span>
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ color: 'var(--status-danger-text)' }}
                  onClick={() => handlePromptDeletePO(selectedPO)}
                >
                  <Trash2 size={13} />
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    handleOpenEmail(selectedPO);
                  }}
                >
                  <Mail size={13} />
                  <span>Send PO to Supplier</span>
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    {selectedPO.poNumber || selectedPO.id}
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
                  {selectedPO.formattedTotal || `₹${Number(selectedPO.totalAmount || selectedPO.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </div>
              </div>
            </div>

            {/* Supplier & Delivery Dossier (2-Column Grid matching PDF layout) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              {/* Order To (Supplier Box) */}
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Building2 size={13} />
                  <span>Order To (Supplier Details)</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedPO.supplier}</div>
                {selectedPO.supplierContact && <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>Attn: {selectedPO.supplierContact}</div>}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedPO.supplierAddress || 'Pune, Maharashtra'}</div>
                <div style={{ marginTop: '8px', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div>Email: <strong style={{ color: '#7A1F3D' }}>{selectedPO.supplierEmail || 'purchase@vendor.com'}</strong></div>
                  <div>Contact No: <strong className="mono">{selectedPO.supplierPhone || selectedPO.supplierContact || '—'}</strong></div>
                  <div>GSTIN: <strong className="mono">{selectedPO.supplierGstin || '27ABDFP3172C1ZH'}</strong></div>
                </div>
              </div>

              {/* Order Metadata 2x2 Grid (matching PDF) */}
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Truck size={13} />
                  <span>Order Details & Place of Supply</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                  <div style={{ padding: '6px', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Order No.</div>
                    <div className="mono" style={{ fontWeight: 700, color: '#7A1F3D' }}>{selectedPO.poNumber || selectedPO.id}</div>
                  </div>
                  <div style={{ padding: '6px', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Date</div>
                    <div className="mono" style={{ fontWeight: 600 }}>{selectedPO.date}</div>
                  </div>
                  <div style={{ padding: '6px', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Due Date:</div>
                    <div className="mono" style={{ fontWeight: 600, color: '#7A1F3D' }}>{selectedPO.dueDate || selectedPO.expectedDelivery || 'Due on Receipt'}</div>
                  </div>
                  <div style={{ padding: '6px', background: '#ffffff', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Place of supply</div>
                    <div style={{ fontWeight: 600 }}>{selectedPO.placeOfSupply || '27-Maharashtra'}</div>
                  </div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Delivery Address: {selectedPO.deliveryAddress || 'SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041'}
                </div>
              </div>
            </div>

            {/* Items Table matching PDF format */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Ordered Spindle Items & Materials</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>Official PDF Table Format</span>
              </div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#ffffff', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 8px', width: '30px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Item name</th>
                    <th style={{ padding: '6px 10px', width: '100px', textAlign: 'left' }}>HSN/ SAC</th>
                    <th style={{ padding: '6px 10px', width: '80px', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '6px 10px', width: '100px', textAlign: 'right' }}>Price/ Unit (₹)</th>
                    <th style={{ padding: '6px 10px', width: '100px', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items && selectedPO.items.map((it, idx) => (
                    <tr key={it.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                        <div>{it.item || it.name}</div>
                        {it.desc && <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{it.desc}</div>}
                      </td>
                      <td className="mono" style={{ padding: '6px 10px' }}>{it.hsn || it.hsn_code || '84821012'}</td>
                      <td className="mono" style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>
                        {it.qty} {it.unit || 'Nos'}
                      </td>
                      <td className="mono" style={{ padding: '6px 10px', textAlign: 'right' }}>
                        ₹{Number(it.rate || it.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="mono" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#7A1F3D' }}>
                        ₹{Number(it.total || (it.qty * it.rate)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Split Financial Box: Words on Left, Amounts on Right (matching PDF) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', padding: '12px 14px', background: 'var(--bg-surface-subtle)', borderTop: '1px solid var(--border-color)', fontSize: '11.5px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Order Amount in Words:
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#7A1F3D', marginTop: '2px', lineHeight: '1.4' }}>
                    {numberToIndianWords ? numberToIndianWords(selectedPO.totalAmount || selectedPO.grandTotal || 0) : '—'}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <strong>Terms and conditions:</strong> {selectedPO.termsAndConditions || selectedPO.notes || 'Thanks for doing business with us!'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sub Total:</span>
                    <span className="mono">₹{Number(selectedPO.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tax (18% GST):</span>
                    <span className="mono">₹{Number(selectedPO.gstAmount || selectedPO.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {selectedPO.roundOff != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6F6267' }}>
                      <span>Round off:</span>
                      <span className="mono">{Number(selectedPO.roundOff) >= 0 ? `+₹${Number(selectedPO.roundOff).toFixed(2)}` : `-₹${Math.abs(Number(selectedPO.roundOff)).toFixed(2)}`}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', fontWeight: 800, color: '#7A1F3D', fontSize: '13px' }}>
                    <span>Total:</span>
                    <span className="mono">₹{Number(selectedPO.totalAmount || selectedPO.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', paddingTop: '2px' }}>
                    <span>Advance:</span>
                    <span className="mono">₹{Number(selectedPO.advance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-main)', fontSize: '12px' }}>
                    <span>Balance:</span>
                    <span className="mono">₹{Number(selectedPO.balance != null ? selectedPO.balance : (selectedPO.totalAmount || selectedPO.grandTotal || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HSN / SAC Tax Summary Table (matching PDF) */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ padding: '6px 10px', background: '#f1f5f9', borderBottom: '1px solid var(--border-color)', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                HSN / SAC Tax Structure (9% CGST + 9% SGST)
              </div>
              <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse', background: '#fafafa' }}>
                <thead>
                  <tr style={{ background: '#ffffff', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left' }}>HSN/ SAC</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>Taxable amount</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>CGST (9%)</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>SGST (9%)</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right' }}>Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="mono" style={{ padding: '5px 8px' }}>{selectedPO.items?.[0]?.hsn || '84821012'}</td>
                    <td className="mono" style={{ padding: '5px 8px', textAlign: 'right' }}>₹{Number(selectedPO.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="mono" style={{ padding: '5px 8px', textAlign: 'right' }}>₹{Number((selectedPO.gstAmount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="mono" style={{ padding: '5px 8px', textAlign: 'right' }}>₹{Number((selectedPO.gstAmount || 0) / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="mono" style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>₹{Number(selectedPO.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Signatory Block */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <div style={{ textAlign: 'center', width: '240px', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '4px', background: '#fafafa' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>For : GENERAL PRECISION SPINDLES</div>
                <div style={{ height: '36px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
                  Authorized Signatory
                </div>
              </div>
            </div>

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

      {/* RICH CONFIRMATION MODAL */}
      <ConfirmActionModal 
        isOpen={confirmModal.isOpen}
        onClose={() => {
          if (!confirmModal.isLoading) {
            setConfirmModal({ isOpen: false, type: 'cancel', po: null, isLoading: false });
          }
        }}
        onConfirm={handleExecuteConfirm}
        onSwitchType={(newType) => {
          setConfirmModal(prev => ({ ...prev, type: newType }));
        }}
        type={confirmModal.type}
        poNumber={confirmModal.po?.poNumber || confirmModal.po?.id}
        supplier={confirmModal.po?.supplier}
        totalAmount={confirmModal.po?.formattedTotal || (confirmModal.po?.totalAmount ? `₹${Number(confirmModal.po.totalAmount).toLocaleString('en-IN')}` : '')}
        status={confirmModal.po?.status}
        itemsCount={confirmModal.po?.items?.length}
        isLoading={confirmModal.isLoading}
      />
      </div>
    </div>
  );
}
