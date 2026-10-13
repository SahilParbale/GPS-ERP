import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { purchaseOrderService } from '../services/database/purchaseOrderService';
import { supplierService } from '../services/database/supplierService';
import { inventoryService } from '../services/database/inventoryService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { 
  exportPurchaseOrderPdf, 
  exportPurchaseOrderRegisterPdf, 
  numberToIndianWords 
} from '../utils/pdfGenerator';
import { PURCHASE_ORDERS } from '../data/mockData';
import { 
  Search, Plus, Eye, Printer, FileText, Send, 
  Download, Trash2, Edit3, Check, X, Building2, 
  User, Phone, MapPin, Mail, Clock, ShoppingCart, 
  CheckCircle2, AlertCircle, Calendar, DollarSign,
  ChevronRight, ArrowRight, ShieldCheck, Truck, RefreshCw, Info,
  Maximize2, Minimize2, CheckCircle, XCircle, FileCheck, Loader2, Sparkles, ZoomIn, ZoomOut, ChevronDown,
  AlertTriangle, PackageCheck
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import ConfirmActionModal from '../components/common/ConfirmActionModal';

const PO_STATUS_OPTIONS = [
  { value: 'Sent', label: 'Sent', color: '#0369a1', bg: '#f0f9ff', icon: Send, description: 'Transmitted to Vendor / Open Order' },
  { value: 'Received', label: 'Received', color: '#7c3aed', bg: '#f5f3ff', icon: CheckCircle, description: 'Goods Received in Stores (Stock Updated)' },
  { value: 'Cancelled', label: 'Cancelled', color: '#991b1b', bg: '#fef2f2', icon: XCircle, description: 'Purchase Order Cancelled' }
];

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
  const [inventoryCatalog, setInventoryCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDocExpanded, setIsDocExpanded] = useState(false);

  // Status dropdowns
  const [updatingPOId, setUpdatingPOId] = useState(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [sidebarStatusMenuPOId, setSidebarStatusMenuPOId] = useState(null);

  // Zoom & Preview ref
  const previewContainerRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(1);

  const handleFitWidth = useCallback(() => {
    if (previewContainerRef.current) {
      const containerWidth = previewContainerRef.current.clientWidth - 48;
      if (containerWidth > 0 && containerWidth < 794) {
        const calculatedScale = Math.max(0.5, Math.min(1, Number((containerWidth / 794).toFixed(2))));
        setZoomScale(calculatedScale);
      } else {
        setZoomScale(1);
      }
    }
  }, []);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPOId, setEditingPOId] = useState(null);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [poForEmail, setPoForEmail] = useState(null);

  // Delete / Cancel confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'cancel',
    po: null,
    isLoading: false
  });

  // Form State for Create / Edit PO
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
    expectedDelivery: '15-09-2026',
    paymentTerms: 'Due on Receipt',
    deliveryAddress: 'SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041',
    notes: 'Thanks for doing business with us!',
    termsAndConditions: 'DIN EN 10204 3.1 Inspection Certificate mandatory with consignment. Rejection of non-conforming lots applies.',
    advance: 0,
    items: [
      { id: 1, item: '120TAC20FME2DBCP5P01-NSK', desc: '120TAC20FME2DBCP5P01-NSK Super Precision Bearings', hsn: '84821012', qty: 1, unit: 'Nos', rate: 58262, gst: 18 }
    ]
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.status-dropdown-container') && !e.target.closest('.sidebar-status-container')) {
        setStatusDropdownOpen(false);
        setSidebarStatusMenuPOId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load dynamic suppliers from service
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
            contact: s.contact_person || s.contact || s.phone || '',
            email: s.email || '',
            phone: s.phone || s.contact || '',
            gstin: s.gstin || '',
            address: s.address || s.location || '',
            city: s.city || '',
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

  // Load Purchase Orders with offline/mock resilience
  const loadPurchaseOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await purchaseOrderService.getPurchaseOrders();
      let orders = [];
      if (res.data && res.data.length > 0) {
        orders = res.data;
      } else {
        orders = (PURCHASE_ORDERS && PURCHASE_ORDERS.length > 0) ? PURCHASE_ORDERS : [];
      }
      // Normalize any legacy Draft or Approved POs to Sent
      orders = orders.map(po => {
        if (po.status === 'Draft' || po.status === 'Approved') {
          return { ...po, status: 'Sent' };
        }
        return po;
      });
      setPurchaseOrders(orders);
      if (orders.length > 0) {
        setSelectedPO(prev => prev ? orders.find(p => (p.poNumber || p.id) === (prev.poNumber || prev.id)) || orders[0] : orders[0]);
      }
    } catch (err) {
      console.warn('Failed to load purchase orders from live database, falling back to cached ledger:', err);
      const fallback = (PURCHASE_ORDERS && PURCHASE_ORDERS.length > 0) 
        ? PURCHASE_ORDERS.map(po => (po.status === 'Draft' || po.status === 'Approved') ? { ...po, status: 'Sent' } : po) 
        : [];
      setPurchaseOrders(fallback);
      if (fallback.length > 0) setSelectedPO(fallback[0]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Inventory Catalog items for quick PO item autocomplete
  const loadInventoryCatalog = async () => {
    try {
      const res = await inventoryService.getInventoryItems();
      if (res.data && res.data.length > 0) {
        setInventoryCatalog(res.data);
      }
    } catch (e) {
      console.warn('Could not load inventory catalog in PO screen:', e);
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
    loadSuppliers();
    loadInventoryCatalog();

    const handleSync = (e) => {
      if (e?.detail?.entity === 'suppliers') {
        loadSuppliers();
      } else if (e?.detail?.entity === 'purchase-orders') {
        loadPurchaseOrders();
      } else if (e?.detail?.entity === 'inventory') {
        loadInventoryCatalog();
      }
    };
    window.addEventListener('gps_entities_updated', handleSync);
    return () => window.removeEventListener('gps_entities_updated', handleSync);
  }, []);

  // Top KPI metrics (4 Cards: Total, Open & In-Transit, Received in Stores, Total Value)
  const metrics = useMemo(() => {
    const totalCount = purchaseOrders.length;
    const openOrders = purchaseOrders.filter(p => p.status === 'Sent').length;
    const receivedOrders = purchaseOrders.filter(p => p.status === 'Received').length;
    const totalValue = purchaseOrders
      .filter(p => p.status !== 'Cancelled')
      .reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    const formattedVal = totalValue >= 100000 
      ? `₹${(totalValue / 100000).toFixed(2)}L` 
      : `₹${totalValue.toLocaleString('en-IN')}`;

    return { 
      totalCount, 
      openOrders, 
      receivedOrders, 
      totalValueFormatted: formattedVal, 
      totalValueRaw: totalValue 
    };
  }, [purchaseOrders]);

  // Filtered list
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesStatus = statusFilter === 'all' || (po.status || '').toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (po.poNumber && po.poNumber.toLowerCase().includes(q)) ||
        (po.id && po.id.toLowerCase().includes(q)) ||
        (po.supplier && po.supplier.toLowerCase().includes(q)) ||
        (po.placeOfSupply && po.placeOfSupply.toLowerCase().includes(q)) ||
        (po.supplierGstin && po.supplierGstin.toLowerCase().includes(q)) ||
        (po.items && po.items.some(it => (it.item || it.name || it.desc || '').toLowerCase().includes(q)));
      return matchesStatus && matchesSearch;
    });
  }, [purchaseOrders, searchQuery, statusFilter]);

  // Handle supplier change in modal form
  const handleSupplierSelect = (supplierName) => {
    if (!supplierName) {
      setFormData(prev => ({ ...prev, supplier: '' }));
      return;
    }
    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = norm(supplierName);
    const matched = availableSuppliers.find(s => 
      s.name.toLowerCase() === supplierName.toLowerCase() || 
      norm(s.name) === cleanName
    );
    if (matched) {
      setFormData(prev => ({
        ...prev,
        supplier: matched.name,
        supplierContact: matched.contact || matched.phone || '',
        supplierEmail: matched.email || '',
        supplierPhone: matched.phone || matched.contact || '',
        supplierGstin: matched.gstin || '',
        supplierAddress: matched.address || '',
        placeOfSupply: matched.placeOfSupply || matched.state || '27-Maharashtra',
        paymentTerms: ''
      }));
    } else {
      setFormData(prev => ({ ...prev, supplier: supplierName }));
    }
  };

  // Reset form to start a clean PO
  const handleResetForm = () => {
    const nextPoNum = `PO/2025-26/${String(Math.floor(100 + Math.random() * 900)).padStart(5, '0')}`;
    const defaultSupp = availableSuppliers[0] || PRESET_SUPPLIERS[0];
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    setFormData({
      poNumber: nextPoNum,
      supplier: defaultSupp.name,
      supplierContact: defaultSupp.contact || defaultSupp.phone || '',
      supplierEmail: defaultSupp.email || '',
      supplierPhone: defaultSupp.phone || defaultSupp.contact || '',
      supplierGstin: defaultSupp.gstin || '',
      supplierAddress: defaultSupp.address || '',
      placeOfSupply: defaultSupp.placeOfSupply || '27-Maharashtra',
      poDate: todayStr,
      expectedDelivery: todayStr,
      paymentTerms: '',
      deliveryAddress: 'SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041',
      notes: 'Thanks for doing business with us!',
      termsAndConditions: 'DIN EN 10204 3.1 Inspection Certificate mandatory with consignment. Rejection of non-conforming lots applies.',
      advance: 0,
      items: [
        { id: Date.now(), item: '', desc: '', hsn: '84821012', qty: 1, unit: 'Nos', rate: 0, gst: 18 }
      ]
    });
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
      if (onNotify) onNotify('A Purchase Order must contain at least one line item', 'warning');
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

  // Auto-fill line item from inventory catalog when user picks a part
  const handleItemSelectCatalog = (id, itemName) => {
    const matched = inventoryCatalog.find(
      inv => (inv.name && inv.name.toLowerCase() === itemName.toLowerCase()) ||
             (inv.sku && inv.sku.toLowerCase() === itemName.toLowerCase()) ||
             (inv.model && inv.model.toLowerCase() === itemName.toLowerCase()) ||
             (inv.partNumber && inv.partNumber.toLowerCase() === itemName.toLowerCase())
    );

    if (matched) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(it => it.id === id ? {
          ...it,
          item: matched.name || matched.sku,
          desc: matched.name || matched.sku,
          hsn: matched.hsn_sac_code || matched.hsn || it.hsn || '84821012',
          unit: matched.unit || it.unit || 'Nos',
          rate: Number(matched.unitCostNum || 0) || Number(it.rate || 0)
        } : it)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(it => it.id === id ? { ...it, item: itemName, desc: itemName } : it)
      }));
    }
  };

  // Live item totals and GST calculations matching PO format
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
      return sum + ((q * r) * (g / 100));
    }, 0);

    const rawTotal = subtotal + gst;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = Number((roundedTotal - rawTotal).toFixed(2));
    const advance = Number(formData.advance) || 0;
    const balance = Math.max(0, roundedTotal - advance);

    return {
      subtotal,
      gst,
      cgst: gst / 2,
      sgst: gst / 2,
      roundOff,
      total: roundedTotal,
      advance,
      balance,
      amountInWords: numberToIndianWords(roundedTotal)
    };
  }, [formData.items, formData.advance]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPOId(null);
    const nextPoNum = `PO/2025-26/${String(Math.floor(100 + Math.random() * 900)).padStart(5, '0')}`;
    const defaultSupp = availableSuppliers[0] || PRESET_SUPPLIERS[0];
    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    setFormData({
      poNumber: nextPoNum,
      supplier: defaultSupp.name,
      supplierContact: defaultSupp.contact || defaultSupp.phone || '',
      supplierEmail: defaultSupp.email || '',
      supplierPhone: defaultSupp.phone || defaultSupp.contact || '',
      supplierGstin: defaultSupp.gstin || '',
      supplierAddress: defaultSupp.address || '',
      placeOfSupply: defaultSupp.placeOfSupply || '27-Maharashtra',
      poDate: todayStr,
      expectedDelivery: todayStr,
      paymentTerms: '',
      deliveryAddress: 'SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041',
      notes: 'Thanks for doing business with us!',
      termsAndConditions: 'DIN EN 10204 3.1 Inspection Certificate mandatory with consignment. Rejection of non-conforming lots applies.',
      advance: 0,
      items: [
        { id: 1, item: '120TAC20FME2DBCP5P01-NSK', desc: '120TAC20FME2DBCP5P01-NSK Super Precision Bearings', hsn: '84821012', qty: 1, unit: 'Nos', rate: 58262, gst: 18 }
      ]
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (po) => {
    const target = po || selectedPO;
    if (!target) return;
    setEditingPOId(target.id || target.poNumber);
    setFormData({
      poNumber: target.poNumber || target.id,
      supplier: target.supplier || '',
      supplierContact: target.supplierContact || target.supplierPhone || '',
      supplierEmail: target.supplierEmail || '',
      supplierPhone: target.supplierPhone || target.supplierContact || '',
      supplierGstin: target.supplierGstin || '',
      supplierAddress: target.supplierAddress || '',
      placeOfSupply: target.placeOfSupply || '27-Maharashtra',
      poDate: target.date || target.poDate || '',
      expectedDelivery: target.dueDate || target.expectedDelivery || target.date || '',
      paymentTerms: target.paymentTerms || '',
      deliveryAddress: target.deliveryAddress || 'SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041',
      notes: target.notes || 'Thanks for doing business with us!',
      termsAndConditions: target.termsAndConditions || 'DIN EN 10204 3.1 Inspection Certificate mandatory with consignment.',
      advance: Number(target.advance || target.advanceAmount || 0),
      items: (target.items && target.items.length > 0) ? target.items.map((it, idx) => ({
        id: it.id || idx + 1,
        item: it.item || it.name || it.desc || '',
        desc: it.desc || it.name || it.item || '',
        hsn: it.hsn || '84821012',
        qty: Number(it.qty) || 1,
        unit: it.unit || 'Nos',
        rate: Number(it.rate || it.unitPrice) || 0,
        gst: Number(it.gst) || 18
      })) : [
        { id: 1, item: '120TAC20FME2DBCP5P01-NSK', desc: '120TAC20FME2DBCP5P01-NSK Super Precision Bearings', hsn: '84821012', qty: 1, unit: 'Nos', rate: 58262, gst: 18 }
      ]
    });
    setIsCreateModalOpen(true);
  };

  // Save PO (Create or Update)
  const handleSavePO = async (e) => {
    e.preventDefault();
    try {
      const itemsPayload = formData.items.map((it, idx) => ({
        id: idx + 1,
        item: it.item || it.desc,
        desc: it.desc || it.item,
        hsn: it.hsn,
        qty: Number(it.qty) || 1,
        unit: it.unit || 'Nos',
        rate: Number(it.rate) || 0,
        unitPrice: Number(it.rate) || 0,
        gst: Number(it.gst) || 18,
        total: (Number(it.qty) || 1) * (Number(it.rate) || 0)
      }));

      const isInterState = formData.placeOfSupply && !formData.placeOfSupply.startsWith('27');

      const poPayload = {
        poNumber: formData.poNumber,
        supplier: formData.supplier,
        supplierContact: formData.supplierContact,
        supplierEmail: formData.supplierEmail,
        supplierPhone: formData.supplierPhone,
        supplierGstin: formData.supplierGstin,
        supplierAddress: formData.supplierAddress,
        placeOfSupply: formData.placeOfSupply,
        date: formData.poDate,
        poDate: formData.poDate,
        dueDate: formData.expectedDelivery,
        expectedDelivery: formData.expectedDelivery,
        paymentTerms: formData.paymentTerms,
        deliveryAddress: formData.deliveryAddress,
        notes: formData.notes,
        termsAndConditions: formData.termsAndConditions,
        subtotal: formTotals.subtotal,
        taxRate: 18,
        gstAmount: formTotals.gst,
        cgstAmount: isInterState ? 0 : formTotals.cgst,
        sgstAmount: isInterState ? 0 : formTotals.sgst,
        igstAmount: isInterState ? formTotals.gst : 0,
        roundOff: formTotals.roundOff,
        totalAmount: formTotals.total,
        formattedTotal: `₹${formTotals.total.toLocaleString('en-IN')}`,
        advance: Number(formData.advance) || 0,
        balance: formTotals.total - (Number(formData.advance) || 0),
        amountInWords: numberToIndianWords(formTotals.total),
        items: itemsPayload,
        status: editingPOId ? (selectedPO?.status || 'Sent') : 'Sent'
      };

      const isExistingVendor = availableSuppliers.some(s => 
        (s.name || '').toLowerCase().trim() === (formData.supplier || '').toLowerCase().trim()
      );

      if (editingPOId) {
        await purchaseOrderService.updatePurchaseOrder(editingPOId, poPayload);
        await supplierService.ensureSupplierFromPO(poPayload);
        setPurchaseOrders(prev => prev.map(p => (p.id === editingPOId || p.poNumber === editingPOId) ? { ...p, ...poPayload } : p));
        setSelectedPO(prev => ({ ...prev, ...poPayload }));
        if (onNotify) onNotify(`Purchase Order ${formData.poNumber} updated successfully.`);
      } else {
        const newRecord = { ...poPayload, id: formData.poNumber, status: 'Sent' };
        await purchaseOrderService.createPurchaseOrder(newRecord);
        await supplierService.ensureSupplierFromPO(newRecord);
        setPurchaseOrders(prev => [newRecord, ...prev]);
        setSelectedPO(newRecord);
        if (isExistingVendor) {
          if (onNotify) onNotify(`Purchase Order ${formData.poNumber} generated successfully. Stock remains pending until marked as Received in Stores.`, 'success');
        } else {
          if (onNotify) onNotify(`Purchase Order ${formData.poNumber} generated! Vendor "${formData.supplier}" auto-saved to Precision Vendors & Component Suppliers directory.`, 'success');
        }
      }

      await loadSuppliers();
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Failed to save Purchase Order:', err);
      if (onNotify) onNotify('Error saving Purchase Order', 'error');
    }
  };

  // Status Change
  const handleUpdateStatus = async (poId, newStatus) => {
    const targetPO = purchaseOrders.find(p => p.id === poId || p.poNumber === poId || p.dbId === poId) || selectedPO;
    const prevStatus = targetPO?.status;

    try {
      setUpdatingPOId(poId);
      const res = await purchaseOrderService.updatePurchaseOrderStatus(poId, newStatus);

      // Inward stock into Materials, Spares & Tooling Inventory ONLY when marked Received
      let stockMsg = '';
      if (newStatus === 'Received' && prevStatus !== 'Received') {
        const summary = res?.stockResult?.summary;
        if (summary) {
          stockMsg = ` • Stock updated in Materials, Spares & Tooling Inventory (${summary})`;
        } else {
          stockMsg = ` • Stock inwarded into Materials, Spares & Tooling Inventory.`;
        }
      } else if (prevStatus === 'Received' && newStatus !== 'Received') {
        stockMsg = ` • Stock inward reversed in Materials, Spares & Tooling Inventory.`;
      }

      setPurchaseOrders(prev => prev.map(p => {
        if (p.id === poId || p.poNumber === poId || p.dbId === poId) {
          return { ...p, status: newStatus };
        }
        return p;
      }));

      if (selectedPO && (selectedPO.id === poId || selectedPO.poNumber === poId || selectedPO.dbId === poId)) {
        setSelectedPO(prev => ({ ...prev, status: newStatus }));
      }

      if (onNotify) {
        onNotify(`Purchase Order ${poId} marked as ${newStatus}.${stockMsg}`, 'success');
      }
    } catch (err) {
      console.error('Failed to update PO status:', err);
      setPurchaseOrders(prev => prev.map(p => {
        if (p.id === poId || p.poNumber === poId || p.dbId === poId) {
          return { ...p, status: newStatus };
        }
        return p;
      }));
      if (selectedPO && (selectedPO.id === poId || selectedPO.poNumber === poId || selectedPO.dbId === poId)) {
        setSelectedPO(prev => ({ ...prev, status: newStatus }));
      }
      if (onNotify) onNotify(`Purchase Order status updated to ${newStatus}.`);
    } finally {
      setUpdatingPOId(null);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (poToExport) => {
    const target = poToExport || selectedPO;
    if (!target) return;
    try {
      const doc = await exportPurchaseOrderPdf(target);
      if (doc && doc.save) {
        doc.save(`${target.poNumber || target.id || 'Purchase_Order'}.pdf`);
      }
      if (onNotify) onNotify(`Purchase Order ${target.poNumber || target.id} downloaded (PDF)`);
    } catch (err) {
      console.error('Failed to export PO PDF:', err);
      if (onNotify) onNotify('Failed to export PO PDF', 'error');
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Open Email Composer
  const handleOpenEmail = (po) => {
    setPoForEmail(po || selectedPO);
    setIsEmailComposerOpen(true);
  };

  // Delete / Cancel Confirmation
  const confirmDeletePO = (po) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      po: po || selectedPO,
      isLoading: false
    });
  };

  const handleExecuteConfirmAction = async () => {
    if (!confirmModal.po) return;
    const poId = confirmModal.po.id || confirmModal.po.poNumber || confirmModal.po.dbId;
    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    try {
      if (confirmModal.type === 'delete') {
        await purchaseOrderService.deletePurchaseOrder(poId);
        setPurchaseOrders(prev => {
          const updated = prev.filter(p => (p.id !== poId && p.poNumber !== poId && p.dbId !== poId));
          if (selectedPO && (selectedPO.id === poId || selectedPO.poNumber === poId || selectedPO.dbId === poId)) {
            setSelectedPO(updated[0] || null);
          }
          return updated;
        });
        if (onNotify) onNotify(`Purchase Order ${poId} deleted successfully.`, 'info');
      } else {
        await handleUpdateStatus(poId, 'Cancelled');
      }
    } catch (err) {
      console.error('Error in PO confirmation action:', err);
      if (onNotify) onNotify('Action could not be completed', 'error');
    } finally {
      setConfirmModal({ isOpen: false, type: 'cancel', po: null, isLoading: false });
    }
  };

  if (isLoading) {
    return <TablePageSkeleton columns={['140px', '220px', '130px', '110px', '120px', '90px']} rows={6} />;
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
            try {
              exportPurchaseOrderRegisterPdf(purchaseOrders);
              if (onNotify) onNotify('Purchase Order Register downloaded (PDF)');
            } catch (err) {
              console.error('Failed to export PO register PDF:', err);
              if (onNotify) onNotify('Failed to export PO register PDF', 'error');
            }
          }}
          title="Export complete Purchase Order Register to PDF"
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
          <span>+ Create New Purchase Order</span>
        </button>
      </PageHeader>

      <div className="content-body">

      {/* Top KPI Metrics Strip (4 Cards) */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Purchase Orders</span>
            <div className="metric-icon-wrap" style={{ color: 'var(--primary)' }}><ShoppingCart size={16} /></div>
          </div>
          <div className="metric-value">{metrics.totalCount}</div>
          <div className="metric-footer" style={{ color: 'var(--primary)' }}>Procurement registry</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Open & In-Transit</span>
            <div className="metric-icon-wrap" style={{ color: '#0284c7' }}><Send size={16} /></div>
          </div>
          <div className="metric-value">{metrics.openOrders}</div>
          <div className="metric-footer" style={{ color: '#0284c7' }}>Active vendor commitments</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Received in Stores</span>
            <div className="metric-icon-wrap" style={{ color: '#16a34a' }}><CheckCircle2 size={16} /></div>
          </div>
          <div className="metric-value">{metrics.receivedOrders}</div>
          <div className="metric-footer" style={{ color: '#16a34a' }}>Stock inward completed</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Purchase Value</span>
            <div className="metric-icon-wrap" style={{ color: '#7A1F3D' }}><DollarSign size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>{metrics.totalValueFormatted}</div>
          <div className="metric-footer" style={{ color: '#7A1F3D' }}>Total procurement commitments</div>
        </div>
      </div>

      {/* Master-Detail Split Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isDocExpanded ? '1fr' : '360px 1fr',
        gap: '16px',
        alignItems: 'start'
      }}>
        {/* Left Column: Compact Purchase Order Cards List */}
        {!isDocExpanded && (
          <div className="section-card" style={{ padding: '0', overflow: 'hidden' }}>
            {/* Search & Filter Bar */}
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search PO #, Supplier, Part..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <CustomSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%', fontSize: '11.5px', height: '30px' }}
                options={[
                  { value: 'all', label: `All Statuses (${purchaseOrders.length})` },
                  { value: 'sent', label: `Sent (${purchaseOrders.filter(p => p.status?.toLowerCase() === 'sent').length})` },
                  { value: 'received', label: `Received (${purchaseOrders.filter(p => p.status?.toLowerCase() === 'received').length})` },
                  { value: 'cancelled', label: `Cancelled (${purchaseOrders.filter(p => p.status?.toLowerCase() === 'cancelled').length})` }
                ]}
              />
            </div>

            {/* PO Cards List */}
            <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
              {filteredPOs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No purchase orders found matching your criteria.
                </div>
              ) : (
                filteredPOs.map((po) => {
                  const isSelected = selectedPO && (selectedPO.id === po.id || selectedPO.poNumber === po.poNumber);
                  const statusOpt = PO_STATUS_OPTIONS.find(o => o.value.toLowerCase() === (po.status || '').toLowerCase()) || PO_STATUS_OPTIONS[0];

                  return (
                    <div
                      key={po.id || po.poNumber}
                      onClick={() => setSelectedPO(po)}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--bg-surface-subtle)' : '#ffffff',
                        borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                          {po.poNumber ? `${po.poNumber}` : po.id}
                        </span>

                        {/* Interactive Status Pill in Card */}
                        <div style={{ position: 'relative' }} className="sidebar-status-container" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSidebarStatusMenuPOId(prev => prev === (po.id || po.poNumber) ? null : (po.id || po.poNumber))}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '12px',
                              border: `1px solid ${statusOpt.color}33`,
                              background: statusOpt.bg,
                              color: statusOpt.color,
                              fontSize: '10.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <span>{statusOpt.label}</span>
                            <ChevronDown size={10} />
                          </button>

                          {/* Quick Status Dropdown in Sidebar */}
                          {sidebarStatusMenuPOId === (po.id || po.poNumber) && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                right: 0,
                                zIndex: 120,
                                minWidth: '150px',
                                background: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                              }}
                            >
                              {PO_STATUS_OPTIONS.map(opt => {
                                const isCurrent = (po.status || '').toLowerCase() === opt.value.toLowerCase();
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateStatus(po.id || po.poNumber, opt.value);
                                      setSidebarStatusMenuPOId(null);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '5px 8px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: isCurrent ? opt.bg : 'transparent',
                                      color: opt.color,
                                      fontSize: '11px',
                                      fontWeight: isCurrent ? 700 : 500,
                                      cursor: 'pointer',
                                      textAlign: 'left'
                                    }}
                                  >
                                    <span>{opt.label}</span>
                                    {isCurrent && <Check size={11} color={opt.color} />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {po.supplier}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        <span>{po.placeOfSupply || '27-Maharashtra'}</span>
                        <span className="mono">{po.date || po.poDate || '04-09-2026'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #f1f5f9' }}>
                        <span className="mono" style={{ fontWeight: 700, color: '#7A1F3D', fontSize: '12.5px' }}>
                          {po.formattedTotal || `₹${Number(po.totalAmount || 0).toLocaleString('en-IN')}`}
                        </span>

                        <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                            onClick={() => setSelectedPO(po)}
                            title="View Purchase Order Sheet"
                          >
                            <Eye size={10} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                            onClick={() => handleOpenEdit(po)}
                            title="Edit Purchase Order"
                          >
                            <Edit3 size={10} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                            onClick={() => handleOpenEmail(po)}
                            title="Transmit Order via Outlook"
                          >
                            <Mail size={10} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: '22px', fontSize: '10px', padding: '0 6px', color: '#dc2626' }}
                            onClick={() => confirmDeletePO(po)}
                            title="Delete Purchase Order"
                          >
                            <Trash2 size={10} />
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

        {/* Right Column: High-Fidelity Authentic Purchase Order Document View */}
        {selectedPO ? (() => {
          const itemsList = (selectedPO.items && selectedPO.items.length > 0) ? selectedPO.items : [
            {
              id: 1,
              item: selectedPO.itemDescription || selectedPO.notes || '120TAC20FME2DBCP5P01-NSK',
              desc: selectedPO.itemDescription || selectedPO.notes || '120TAC20FME2DBCP5P01-NSK Super Precision Bearings',
              hsn: selectedPO.hsn || '84821012',
              qty: selectedPO.qty != null ? selectedPO.qty : 1,
              unit: selectedPO.unit || 'Nos',
              rate: selectedPO.unitPrice || selectedPO.rate || 58262,
              unitPrice: selectedPO.unitPrice || selectedPO.rate || 58262,
              total: selectedPO.totalAmount || 58262
            }
          ];

          const calculatedSubtotal = Number(selectedPO.subtotal) || itemsList.reduce(
            (sum, it) => sum + (Number(it.total != null ? it.total : (Number(it.qty || 1) * Number(it.rate || it.unitPrice || 0))) || 0),
            0
          );

          const isInterState = selectedPO.placeOfSupply && !selectedPO.placeOfSupply.startsWith('27');
          const taxRate = Number(selectedPO.taxRate) || 18;
          const calculatedTax = Number(selectedPO.taxAmount != null ? selectedPO.taxAmount : (selectedPO.gstAmount != null ? selectedPO.gstAmount : Number((calculatedSubtotal * (taxRate / 100)).toFixed(2))));
          const calculatedCgst = isInterState ? 0 : Number((calculatedTax / 2).toFixed(2));
          const calculatedSgst = isInterState ? 0 : Number((calculatedTax / 2).toFixed(2));
          const calculatedIgst = isInterState ? calculatedTax : 0;

          const rawTotal = calculatedSubtotal + calculatedTax;
          const calculatedRoundOff = selectedPO.roundOff != null 
            ? Number(selectedPO.roundOff) 
            : (selectedPO.totalAmount ? Number((Number(selectedPO.totalAmount) - rawTotal).toFixed(2)) : Number((Math.round(rawTotal) - rawTotal).toFixed(2)));

          const calculatedTotal = selectedPO.totalAmount != null 
            ? Number(selectedPO.totalAmount) 
            : Math.round(rawTotal);

          const totalQuantity = itemsList.reduce((s, it) => s + (Number(it.qty != null ? it.qty : 1) || 0), 0);
          const statusOpt = PO_STATUS_OPTIONS.find(o => o.value.toLowerCase() === (selectedPO.status || '').toLowerCase()) || PO_STATUS_OPTIONS[0];

          const hsnBreakdown = (() => {
            const map = {};
            itemsList.forEach((it) => {
              const hsn = it.hsn || it.hsn_code || '84821012';
              const amt = Number(it.total != null ? it.total : (Number(it.qty || 1) * Number(it.rate || it.unitPrice || 0))) || 0;
              if (!map[hsn]) {
                map[hsn] = { hsn, taxable: 0, rate: '18%' };
              }
              map[hsn].taxable += amt;
            });
            return Object.values(map);
          })();

          const advanceAmount = Number(selectedPO.advance || selectedPO.advanceAmount || 0);
          const balanceAmount = Number(selectedPO.balance != null ? selectedPO.balance : (calculatedTotal - advanceAmount));

          return (
            <div className="section-card" style={{ padding: '0', overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Document Action Bar Header */}
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
                  <span className="mono" style={{ fontWeight: 700, fontSize: '14px' }}>
                    {selectedPO.poNumber ? `${selectedPO.poNumber}` : selectedPO.id}
                  </span>

                  {/* Interactive Status Changer Dropdown */}
                  <div style={{ position: 'relative' }} className="status-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setStatusDropdownOpen(prev => !prev)}
                      title={`Status is "${selectedPO.status}". Click to switch status.`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-surface)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {updatingPOId === (selectedPO.id || selectedPO.poNumber) ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '11px' }}>
                          <Loader2 size={12} className="spin-icon" />
                          <span>Updating...</span>
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: statusOpt.color,
                          fontWeight: 700
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusOpt.color }} />
                          <span>{statusOpt.label}</span>
                        </span>
                      )}
                      <ChevronDown size={11} color="var(--text-muted)" style={{ transition: 'transform 0.2s ease', transform: statusDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    {statusDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          left: 0,
                          zIndex: 100,
                          minWidth: '220px',
                          background: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px'
                        }}
                      >
                        <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Change Order Status
                        </div>
                        {PO_STATUS_OPTIONS.map(opt => {
                          const isCurrent = (selectedPO.status || '').toLowerCase() === opt.value.toLowerCase();
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                handleUpdateStatus(selectedPO.id || selectedPO.poNumber, opt.value);
                                setStatusDropdownOpen(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isCurrent ? opt.bg : 'transparent',
                                color: opt.color,
                                fontSize: '11.5px',
                                fontWeight: isCurrent ? 700 : 500,
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon size={13} color={opt.color} />
                                <div>
                                  <div>{opt.label}</div>
                                  <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{opt.description}</div>
                                </div>
                              </div>
                              {isCurrent && <Check size={13} color={opt.color} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {selectedPO.supplier}</span>
                </div>

                {/* Right Tool Buttons */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEmail(selectedPO)}
                    title="Transmit PO to Supplier via Outlook"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                  >
                    <Mail size={12} />
                    <span>Send Email</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDownloadPdf(selectedPO)}
                    title="Download official Purchase Order PDF"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                  >
                    <Download size={12} />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handlePrint}
                    title="Print Purchase Order"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                  >
                    <Printer size={12} />
                    <span>Print</span>
                  </button>

                  {/* Zoom & Fit Controls */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '6px', height: '28px', padding: '0 2px' }}>
                    <button
                      type="button"
                      onClick={() => setZoomScale(prev => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                      title="Zoom Out"
                      style={{ background: 'transparent', border: 'none', padding: '0 5px', cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
                    >
                      <ZoomOut size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(1)}
                      title="Reset to 100%"
                      style={{ background: 'transparent', border: 'none', padding: '0 5px', cursor: 'pointer', height: '100%', fontSize: '10px', fontWeight: 600, color: 'var(--text-main)', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}
                    >
                      {Math.round(zoomScale * 100)}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(prev => Math.min(1.5, Number((prev + 0.1).toFixed(2))))}
                      title="Zoom In"
                      style={{ background: 'transparent', border: 'none', padding: '0 5px', cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
                    >
                      <ZoomIn size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={handleFitWidth}
                      title="Auto-fit order sheet to container width"
                      style={{ background: 'transparent', border: 'none', padding: '0 6px', cursor: 'pointer', height: '100%', fontSize: '10px', color: 'var(--primary)', fontWeight: 600, borderLeft: '1px solid var(--border-color)' }}
                    >
                      Fit
                    </button>
                  </div>

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
                    onClick={() => handleOpenEdit(selectedPO)}
                    title="Edit Order Particulars"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                  >
                    <Edit3 size={12} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => confirmDeletePO(selectedPO)}
                    title="Delete Purchase Order"
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

              {/* Document Body — Authentic 1:1 A4 Printed Page Preview matching GPS ERP Standard */}
              <div
                ref={previewContainerRef}
                style={{
                  background: 'transparent',
                  padding: '16px 0',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  flex: 1,
                  minHeight: '0',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{
                  minWidth: 'max-content',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: '100%',
                  padding: '0 8px',
                  boxSizing: 'border-box',
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out'
                }}>
                  <div
                    id="printable-purchase-order"
                    style={{
                      width: '794px',
                      minWidth: '794px',
                      maxWidth: '794px',
                      minHeight: '1123px',
                      background: '#ffffff',
                      padding: '24px 28px',
                      color: '#000000',
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      boxShadow: 'none',
                      border: '1px solid var(--border-color)',
                      boxSizing: 'border-box',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* 1. Document Title Banner: Purchase Order */}
                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#000000', marginBottom: '6px', letterSpacing: '0.02em', flexShrink: 0 }}>
                      Purchase Order
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
                      {/* 2. Company Header & Metadata Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                        {/* Left: GPS Logo & Details */}
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
                              <Phone size={8} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '2px' }} />+919764252188 / 9764032929<br />
                              Email: process@gpsspindles.net<br />
                              GSTIN: 27AATFG1527D1ZF<br />
                              State: 27-Maharashtra
                            </div>
                          </div>
                        </div>

                        {/* Right: Metadata Grid (Row 1: Order No./Date, Row 2: Due Date:/Place of supply, Row 3: Empty Box) */}
                        <div style={{ borderLeft: '1px solid #b8b8b8', display: 'flex', flexDirection: 'column' }}>
                          {/* Row 1: Order No. & Date */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                            <div style={{ padding: '3.5px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Order No.</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedPO.poNumber || selectedPO.id || 'PO/2025-26/00106'}
                              </div>
                            </div>
                            <div style={{ padding: '3.5px 6px', borderLeft: '1px solid #b8b8b8' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Date</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedPO.date || selectedPO.poDate || '04-09-2026'}
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Due Date: & Place of supply */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                            <div style={{ padding: '3.5px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Due Date:</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedPO.dueDate || selectedPO.expectedDelivery || selectedPO.date || '04-09-2026'}
                              </div>
                            </div>
                            <div style={{ padding: '3.5px 6px', borderLeft: '1px solid #b8b8b8' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Place of supply</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedPO.placeOfSupply || '27-Maharashtra'}
                              </div>
                            </div>
                          </div>

                          {/* Row 3: Empty Box (Payment Terms removed matching PDF format) */}
                          <div style={{ flex: 1, minHeight: '34px' }}></div>
                        </div>
                      </div>

                      {/* 3. Order To (Supplier Box matching PDF format) */}
                      <div style={{ padding: '8px 12px 14px 12px', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                        <div style={{ fontSize: '7.8px', color: '#000000', marginBottom: '3px' }}>
                          Order To
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#000000', marginBottom: '4px' }}>
                          {selectedPO.supplier || selectedPO.vendorName || selectedPO.vendor || 'PREMIER INDUSTRIAL SOLUTIONS'}
                        </div>
                        <div style={{ fontSize: '8px', color: '#000000', lineHeight: '1.32', marginBottom: '14px' }}>
                          {selectedPO.supplierAddress ? (
                            selectedPO.supplierAddress.includes('\n') ? (
                              selectedPO.supplierAddress.split('\n').map((l, i) => <div key={i}>{l}</div>)
                            ) : (
                              <>
                                <div>{selectedPO.supplierAddress}</div>
                                <div>India</div>
                              </>
                            )
                          ) : (
                            <>
                              <div>P-84, D-II BLOCK MIDC Road Pimpri Chinchwad</div>
                              <div>Pune, Maharashtra-411019</div>
                              <div>India</div>
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: '8px', color: '#000000', marginBottom: '4px' }}>
                          Contact No. : {selectedPO.supplierContact || selectedPO.supplierPhone || selectedPO.contact || '0124-4510000'}
                        </div>
                        <div style={{ fontSize: '8px', color: '#000000', marginBottom: '4px' }}>
                          GSTIN : {selectedPO.supplierGstin || selectedPO.gstin || '27ABDFP3172C1ZH'}
                        </div>
                        <div style={{ fontSize: '8px', color: '#000000' }}>
                          State: {selectedPO.placeOfSupply || selectedPO.state || '27-Maharashtra'}
                        </div>
                      </div>

                      {/* 4. Line Items Table (matching PDF format) */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #b8b8b8', fontSize: '8px', color: '#000000', flexShrink: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 5px', width: '28px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>#</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>Item name</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '90px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>HSN/ SAC</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '70px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Quantity</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '95px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Price/ Unit</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', padding: '3.5px 6px', width: '105px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsList.map((item, idx) => {
                            const itemTotal = Number(item.total != null ? item.total : (Number(item.qty || 1) * Number(item.rate || item.unitPrice || 0))) || 0;
                            return (
                              <tr key={item.id || idx}>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 5px', textAlign: 'left' }}>
                                  {idx + 1}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', fontWeight: 700 }}>
                                  {item.item || item.name || item.desc}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'left' }}>
                                  {item.hsn || '84821012'}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                                  {item.qty}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                                  ₹ {Number(item.rate || item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                                  ₹ {itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
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

                      {/* 5. Middle Section: Order Amount in Words & Amounts matching PDF */}
                      <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                        {/* Left: Order Amount in Words */}
                        <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: '7.5px', color: '#000000' }}>Order Amount in Words</div>
                          <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#000000', marginTop: '4px', textTransform: 'capitalize' }}>
                            {selectedPO.amountInWords || numberToIndianWords(calculatedTotal)}
                          </div>
                        </div>

                        {/* Right: Amounts Box matching Purchase Order_PO 2025-26 00106_PREMIER.pdf */}
                        <div style={{ borderLeft: '1px solid #b8b8b8', padding: '6px 10px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: '8px', color: '#000000', marginBottom: '4px', fontWeight: 600 }}>Amounts</div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0' }}>
                            <span>Sub Total</span>
                            <span>₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0' }}>
                            <span>Tax ({taxRate}%)</span>
                            <span>₹ {calculatedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          {Math.abs(calculatedRoundOff) > 0.001 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0' }}>
                              <span>Round off</span>
                              <span>{calculatedRoundOff < 0 ? `- ₹ ${Math.abs(calculatedRoundOff).toFixed(2)}` : `₹ ${calculatedRoundOff.toFixed(2)}`}</span>
                            </div>
                          )}

                          <div style={{ borderTop: '1px solid #b8b8b8', margin: '4px -10px' }} />

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.8px', fontWeight: 700, padding: '3px 0' }}>
                            <span>Total</span>
                            <span>₹ {calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0' }}>
                            <span>Advance</span>
                            <span>₹ {advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: 700, padding: '3px 0' }}>
                            <span>Balance</span>
                            <span>₹ {balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {/* 6. HSN/SAC Tax Summary Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #b8b8b8', fontSize: '7.8px', color: '#000000', flexShrink: 0 }}>
                        <thead>
                          <tr style={{ background: '#ffffff', borderBottom: '1px solid #b8b8b8' }}>
                            <th rowSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, width: isInterState ? '22%' : '18%' }}>HSN/ SAC</th>
                            <th rowSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, width: isInterState ? '24%' : '20%' }}>Taxable amount</th>
                            {!isInterState ? (
                              <>
                                <th colSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', fontWeight: 700, width: '22%' }}>CGST</th>
                                <th colSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', fontWeight: 700, width: '22%' }}>SGST</th>
                              </>
                            ) : (
                              <th colSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', fontWeight: 700, width: '30%' }}>IGST</th>
                            )}
                            <th rowSpan={2} style={{ padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, width: isInterState ? '24%' : '18%' }}>Total Tax Amount</th>
                          </tr>
                          <tr style={{ background: '#ffffff', borderBottom: '1px solid #b8b8b8' }}>
                            {!isInterState ? (
                              <>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Rate</th>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Amount</th>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Rate</th>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Amount</th>
                              </>
                            ) : (
                              <>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700, width: '14%' }}>Rate</th>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 6px', textAlign: 'center', fontWeight: 700, width: '16%' }}>Amount</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {hsnBreakdown.map((row, idx) => {
                            const cgstAmt = Number((row.taxable * 0.09).toFixed(2));
                            const sgstAmt = Number((row.taxable * 0.09).toFixed(2));
                            const igstAmt = Number((row.taxable * 0.18).toFixed(2));
                            const totalTax = isInterState ? igstAmt : Number((cgstAmt + sgstAmt).toFixed(2));
                            return (
                              <tr key={idx}>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'left' }}>
                                  {row.hsn || ''}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                  ₹ {Number(row.taxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                {!isInterState ? (
                                  <>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 4px', textAlign: 'right' }}>9%</td>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 4px', textAlign: 'right' }}>
                                      ₹ {cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 4px', textAlign: 'right' }}>9%</td>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 4px', textAlign: 'right' }}>
                                      ₹ {sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                      {row.rate || '18%'}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                      ₹ {igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </>
                                )}
                                <td style={{ borderBottom: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                  ₹ {totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                          {/* HSN Table Total */}
                          <tr style={{ fontWeight: 700 }}>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>Total</td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                              ₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {!isInterState ? (
                              <>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}></td>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>
                                  ₹ {calculatedCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}></td>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>
                                  ₹ {calculatedSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}></td>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                                  ₹ {calculatedIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </>
                            )}
                            <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                              ₹ {calculatedTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 7. Bottom Section: Terms and conditions & Signatory matching PDF */}
                      <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', fontSize: '7.8px', color: '#000000', flexShrink: 0, minHeight: '68px' }}>
                        {/* Col 1: Terms and conditions */}
                        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontWeight: 700, fontSize: '8.5px', marginBottom: '4px' }}>Terms and conditions</div>
                          <div style={{ fontSize: '8px', lineHeight: '1.45', color: '#000000', whiteSpace: 'pre-wrap' }}>
                            {selectedPO.termsAndConditions || selectedPO.terms || 'Thanks for doing business with us!'}
                          </div>
                        </div>

                        {/* Col 2: Signatory */}
                        <div style={{ borderLeft: '1px solid #b8b8b8', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', boxSizing: 'border-box' }}>
                          <div style={{ fontSize: '8px', fontWeight: 400, textAlign: 'center' }}>
                            For : GENERAL PRECISION SPINDLES
                          </div>
                          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '8.5px', paddingBottom: '4px' }}>
                            Authorized Signatory
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : (
          <div className="section-card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShoppingCart size={48} style={{ opacity: 0.25, margin: '0 auto 16px', color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>No Purchase Order Selected</h3>
            <p style={{ fontSize: '13px', maxWidth: '380px', margin: '0 auto' }}>
              Select a purchase order from the left list or create a new purchase order.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CREATE / EDIT PURCHASE ORDER MODAL (Matching Official PO Format)           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>
                {editingPOId ? `Edit Purchase Order — ${formData.poNumber}` : 'Create Purchase Order'}
              </span>
              <span className="badge" style={{ background: '#fdf2f4', color: '#7A1F3D', border: '1px solid #f9d8e0', fontSize: '10.5px', fontWeight: 600 }}>
                Official PO Format
              </span>
            </div>
            {!editingPOId && (
              <button
                type="button"
                onClick={handleResetForm}
                title="Clear all form fields to start fresh"
                style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-color)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-main)',
                  transition: 'all 0.15s ease'
                }}
              >
                <RefreshCw size={11} />
                <span>Reset Form</span>
              </button>
            )}
          </div>
        }
        maxWidth="860px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Total: <strong className="mono" style={{ color: '#7A1F3D', fontSize: '14.5px', fontWeight: 800 }}>₹{formTotals.total.toLocaleString('en-IN')}</strong> (Incl. 18% GST)
              {formTotals.advance > 0 && (
                <span style={{ marginLeft: '10px', fontSize: '11.5px' }}>
                  • Advance: <strong className="mono">₹{formTotals.advance.toLocaleString('en-IN')}</strong> • Balance: <strong className="mono" style={{ color: '#7A1F3D' }}>₹{formTotals.balance.toLocaleString('en-IN')}</strong>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSavePO}
                style={{
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #7A1F3D 0%, #5e162d 100%)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileCheck size={14} />
                <span>{editingPOId ? 'Update Purchase Order' : 'Save & Issue PO'}</span>
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSavePO} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Section 1: Order Information & Coordinates (Matching Top-Right Metadata Box) */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
              <FileText size={14} />
              <span>Order Information & Coordinates</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Order No. *</label>
                <input 
                  type="text" 
                  className="form-control mono"
                  style={{ height: '32px', fontSize: '12px', fontWeight: 600 }}
                  value={formData.poNumber}
                  onChange={e => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                  placeholder="PO/2025-26/00106"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Date *</label>
                <input 
                  type="text" 
                  className="form-control mono"
                  style={{ height: '32px', fontSize: '12px' }}
                  value={formData.poDate}
                  onChange={e => setFormData(prev => ({ ...prev, poDate: e.target.value }))}
                  placeholder="04-09-2026"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Due Date: *</label>
                <input 
                  type="text" 
                  className="form-control mono"
                  style={{ height: '32px', fontSize: '12px' }}
                  value={formData.expectedDelivery}
                  onChange={e => setFormData(prev => ({ ...prev, expectedDelivery: e.target.value }))}
                  placeholder="04-09-2026"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Place of supply *</label>
                <select
                  className="form-control"
                  style={{ height: '32px', fontSize: '11.5px' }}
                  value={formData.placeOfSupply}
                  onChange={e => setFormData(prev => ({ ...prev, placeOfSupply: e.target.value }))}
                >
                  <option value="27-Maharashtra">27-Maharashtra (CGST 9% + SGST 9%)</option>
                  <option value="24-Gujarat">24-Gujarat (IGST 18%)</option>
                  <option value="29-Karnataka">29-Karnataka (IGST 18%)</option>
                  <option value="23-Madhya Pradesh">23-Madhya Pradesh (IGST 18%)</option>
                  <option value="33-Tamil Nadu">33-Tamil Nadu (IGST 18%)</option>
                  <option value="36-Telangana">36-Telangana (IGST 18%)</option>
                  <option value="06-Haryana">06-Haryana (IGST 18%)</option>
                  <option value="07-Delhi">07-Delhi (IGST 18%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Order To (Vendor / Supplier Particulars) */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                <Building2 size={14} />
                <span>Order To (Vendor / Supplier Particulars)</span>
              </div>
              {(() => {
                const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const curNorm = norm(formData.supplier);
                const matched = curNorm ? availableSuppliers.find(s => norm(s.name) === curNorm || s.name.toLowerCase() === (formData.supplier || '').toLowerCase()) : null;
                if (matched) {
                  return (
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      background: '#F5E8ED', 
                      color: '#7A1F3D', 
                      border: '1px solid #e2ccd5', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px', 
                      fontWeight: 600 
                    }}>
                      <Building2 size={11} />
                      Verified Supplier: {matched.code || 'Registered'}
                    </span>
                  );
                } else if (formData.supplier && formData.supplier.trim()) {
                  return (
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      background: '#ecfdf5', 
                      color: '#047857', 
                      border: '1px solid #a7f3d0', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px', 
                      fontWeight: 600 
                    }}>
                      <CheckCircle2 size={11} />
                      New Vendor (Auto-saves to Precision Vendors & Component Suppliers)
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            {/* Quick Supplier Selector from Precision Suppliers Directory */}
            <div style={{ marginBottom: '10px', background: '#fdf8fa', border: '1px dashed #e2ccd5', padding: '8px 10px', borderRadius: '4px' }}>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px', color: '#7A1F3D', display: 'flex', justifyContent: 'space-between' }}>
                <span>Select from Precision Suppliers Directory ({availableSuppliers.length} Registered Vendors)</span>
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>Or choose "Type New Vendor" to write manually</span>
              </label>
              <select
                className="form-control"
                style={{ height: '32px', fontSize: '12px', borderColor: '#7A1F3D', color: '#7A1F3D', fontWeight: 600 }}
                value={(() => {
                  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  const curNorm = norm(formData.supplier);
                  const found = curNorm ? availableSuppliers.find(s => norm(s.name) === curNorm || s.name.toLowerCase() === (formData.supplier || '').toLowerCase()) : null;
                  return found ? found.name : (formData.supplier ? '__manual__' : '');
                })()}
                onChange={(e) => {
                  if (e.target.value === '__manual__') {
                    setFormData(prev => ({
                      ...prev,
                      supplier: '',
                      supplierContact: '',
                      supplierEmail: '',
                      supplierPhone: '',
                      supplierGstin: '',
                      supplierAddress: '',
                      placeOfSupply: '27-Maharashtra'
                    }));
                  } else if (e.target.value) {
                    handleSupplierSelect(e.target.value);
                  }
                }}
              >
                <option value="">-- Choose Existing Supplier from Precision Directory --</option>
                {availableSuppliers.map((s, idx) => (
                  <option key={idx} value={s.name}>
                    {s.name} ({s.code || 'SUPP'}) {s.city ? `— ${s.city}` : ''}
                  </option>
                ))}
                <option value="__manual__">+ Enter New / Unlisted Vendor Manually (Not in Directory)...</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>
                  Vendor / Supplier Name *
                </label>
                <input
                  list="po-suppliers-datalist"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px', fontWeight: 600, color: '#7A1F3D' }}
                  value={formData.supplier}
                  onChange={e => handleSupplierSelect(e.target.value)}
                  placeholder="e.g. PREMIER INDUSTRIAL SOLUTIONS or type new vendor..."
                  required
                />
                <datalist id="po-suppliers-datalist">
                  {availableSuppliers.map((s, idx) => (
                    <option key={idx} value={s.name}>
                      {s.name} ({s.code || 'VENDOR'})
                    </option>
                  ))}
                </datalist>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {availableSuppliers.some(s => s.name.toLowerCase() === (formData.supplier || '').toLowerCase()) ? (
                    <span style={{ color: '#7A1F3D' }}>Linked to directory. Particulars auto-filled below.</span>
                  ) : formData.supplier ? (
                    <span style={{ color: '#047857' }}>Unlisted vendor. Will automatically register in Suppliers directory on save.</span>
                  ) : (
                    <span>Type vendor name or pick from dropdown above.</span>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Contact No. : *</label>
                <input 
                  type="text" 
                  className="form-control mono"
                  style={{ height: '32px', fontSize: '12px' }}
                  value={formData.supplierContact}
                  onChange={e => setFormData(prev => ({ ...prev, supplierContact: e.target.value, supplierPhone: e.target.value }))}
                  placeholder="0124-4510000"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>GSTIN : *</label>
                <input 
                  type="text" 
                  className="form-control mono"
                  style={{ height: '32px', fontSize: '12px' }}
                  value={formData.supplierGstin}
                  onChange={e => setFormData(prev => ({ ...prev, supplierGstin: e.target.value.toUpperCase() }))}
                  placeholder="27ABDFP3172C1ZH"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.8fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Supplier Full Address *</label>
                <input 
                  type="text" 
                  className="form-control"
                  style={{ height: '32px', fontSize: '11.5px' }}
                  value={formData.supplierAddress}
                  onChange={e => setFormData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                  placeholder="P-84, D-II BLOCK MIDC Road Pimpri Chinchwad, Pune, Maharashtra-411019"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Supplier Email (for Outlook transmission)</label>
                <input 
                  type="email" 
                  className="form-control"
                  style={{ height: '32px', fontSize: '11.5px' }}
                  value={formData.supplierEmail}
                  onChange={e => setFormData(prev => ({ ...prev, supplierEmail: e.target.value }))}
                  placeholder="sales@premierindustrial.in"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>State</label>
                <input 
                  type="text" 
                  className="form-control"
                  style={{ height: '32px', fontSize: '11.5px' }}
                  value={formData.placeOfSupply}
                  onChange={e => setFormData(prev => ({ ...prev, placeOfSupply: e.target.value }))}
                  placeholder="27-Maharashtra"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Line Items (Matching Purchase Order Table) */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                  <ShoppingCart size={14} />
                  <span>Line Items (Purchase Order Table)</span>
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Columns correspond strictly to official PO format: Item name, HSN/SAC, Quantity, Price/Unit, Amount.
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleAddItem}
                style={{ fontSize: '11px', padding: '4px 10px', gap: '4px' }}
              >
                <Plus size={11} />
                <span>Add Item</span>
              </button>
            </div>

            {/* Datalist for inventory catalog items autocomplete */}
            <datalist id="po-catalog-datalist">
              {inventoryCatalog.map((inv, idx) => (
                <option key={inv.id || idx} value={inv.name || inv.sku}>
                  {inv.name} ({inv.sku || inv.model}) • ₹{inv.unitCostNum || inv.unitCost}
                </option>
              ))}
            </datalist>

            <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 8px', width: '32px', textAlign: 'left', fontWeight: 700 }}>#</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>Item name *</th>
                    <th style={{ padding: '6px 8px', width: '95px', textAlign: 'left', fontWeight: 700 }}>HSN/ SAC</th>
                    <th style={{ padding: '6px 8px', width: '70px', textAlign: 'right', fontWeight: 700 }}>Quantity *</th>
                    <th style={{ padding: '6px 8px', width: '65px', textAlign: 'center', fontWeight: 700 }}>Unit</th>
                    <th style={{ padding: '6px 8px', width: '105px', textAlign: 'right', fontWeight: 700 }}>Price/ Unit (₹) *</th>
                    <th style={{ padding: '6px 8px', width: '105px', textAlign: 'right', fontWeight: 700 }}>Amount (₹)</th>
                    <th style={{ padding: '6px 4px', width: '35px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((it, idx) => {
                    const rowTotal = (Number(it.qty) || 0) * (Number(it.rate) || 0);
                    return (
                      <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="text" 
                            list="po-catalog-datalist"
                            className="form-control"
                            style={{ height: '28px', fontSize: '11.5px', fontWeight: 600 }}
                            placeholder="Type part name or choose from inventory catalog..."
                            value={it.item}
                            onChange={e => handleItemSelectCatalog(it.id, e.target.value)}
                            required
                          />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="text" 
                            className="form-control mono"
                            style={{ height: '28px', fontSize: '11px' }}
                            placeholder="84821012"
                            value={it.hsn}
                            onChange={e => handleItemChange(it.id, 'hsn', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="number" 
                            min="1"
                            className="form-control mono"
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'right' }}
                            value={it.qty}
                            onChange={e => handleItemChange(it.id, 'qty', e.target.value)}
                            required
                          />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <select 
                            className="form-control"
                            style={{ height: '28px', fontSize: '11px', padding: '0 4px', textAlign: 'center' }}
                            value={it.unit}
                            onChange={e => handleItemChange(it.id, 'unit', e.target.value)}
                          >
                            <option value="Nos">Nos</option>
                            <option value="Pairs">Pairs</option>
                            <option value="Sets">Sets</option>
                            <option value="Bars">Bars</option>
                            <option value="Meters">Meters</option>
                            <option value="Kg">Kg</option>
                            <option value="Tins">Tins</option>
                            <option value="Pcs">Pcs</option>
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="number" 
                            min="0"
                            step="any"
                            className="form-control mono"
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'right' }}
                            placeholder="0"
                            value={it.rate}
                            onChange={e => handleItemChange(it.id, 'rate', e.target.value)}
                            required
                          />
                        </td>
                        <td className="mono" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, fontSize: '11.5px' }}>
                          ₹ {rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItem(it.id)}
                            style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '3px' }}
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
          </div>

          {/* Section 4: Amounts Summary & Commercial Breakdown (Matching Authentic PO Format) */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
              <DollarSign size={14} />
              <span>Amounts & Commercial Breakdown</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', alignItems: 'start' }}>
              {/* Left Column: Words, Shipping & Quality Clauses */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Order Amount in Words</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginTop: '2px', textTransform: 'capitalize' }}>
                    {formTotals.amountInWords}
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Delivery Address</label>
                  <input 
                    type="text" 
                    className="form-control"
                    style={{ height: '30px', fontSize: '11px' }}
                    value={formData.deliveryAddress}
                    onChange={e => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Terms and conditions</label>
                  <textarea 
                    className="form-control"
                    rows={2}
                    value={formData.termsAndConditions}
                    onChange={e => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                    style={{ fontSize: '11px', height: '48px', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Right Column: Replicated Authentic PO "Amounts" Box */}
              <div style={{ 
                background: '#ffffff', 
                border: '1px solid #b8b8b8', 
                borderRadius: '6px', 
                padding: '10px 14px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '5px',
                fontSize: '11.5px' 
              }}>
                <div style={{ fontWeight: 700, fontSize: '12px', color: '#000000', marginBottom: '4px' }}>
                  Amounts
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sub Total</span>
                  <span className="mono">₹ {formTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tax (18%)</span>
                  <span className="mono">₹ {formTotals.gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {Math.abs(formTotals.roundOff) > 0.001 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Round off</span>
                    <span className="mono">{formTotals.roundOff < 0 ? `- ₹ ${Math.abs(formTotals.roundOff).toFixed(2)}` : `₹ ${formTotals.roundOff.toFixed(2)}`}</span>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #b8b8b8', margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px' }}>
                  <span>Total</span>
                  <span className="mono">₹ {formTotals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Advance (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-control mono"
                    style={{ width: '120px', height: '26px', fontSize: '11.5px', textAlign: 'right' }}
                    value={formData.advance}
                    onChange={e => setFormData(prev => ({ ...prev, advance: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#7A1F3D', fontSize: '12.5px', marginTop: '2px' }}>
                  <span>Balance</span>
                  <span className="mono">₹ {formTotals.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* OUTLOOK EMAIL COMPOSER                                                     */}
      {/* ========================================================================= */}
      <OutlookEmailComposer 
        isOpen={isEmailComposerOpen}
        onClose={() => setIsEmailComposerOpen(false)}
        documentData={poForEmail || selectedPO}
        documentType="purchase_order"
        onNotify={onNotify}
      />

      {/* ========================================================================= */}
      {/* CONFIRMATION / DELETE MODAL                                               */}
      {/* ========================================================================= */}
      <ConfirmActionModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: 'cancel', po: null, isLoading: false })}
        onConfirm={handleExecuteConfirmAction}
        onSwitchType={(newType) => setConfirmModal(prev => ({ ...prev, type: newType }))}
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
