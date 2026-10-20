import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { salesService } from '../services/database/salesService';
import { customerService } from '../services/database/customerService';
import { proformaInvoiceService } from '../services/database/proformaInvoiceService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportQuotationPdf, exportElementAsPdf, numberToIndianWords } from '../utils/pdfGenerator';
import { 
  Search, Plus, Eye, Printer, CheckCircle, CheckCircle2, FileText, 
  Send, DollarSign, ArrowRight, Download, Trash2, Edit3, 
  Check, RefreshCw, X, FileCheck, Building2, User, Phone, 
  MapPin, Hash, Maximize2, Minimize2, ChevronRight, Mail, AlertCircle,
  Loader2, Calendar, Clock, XCircle, ChevronDown, ChevronUp, ZoomIn, ZoomOut, ChevronLeft
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import UpiQrCode from '../components/common/UpiQrCode';
import { getActiveUpiId, DEFAULT_BANK_DETAILS } from '../utils/upiQrGenerator';

const QUOTE_STATUS_OPTIONS = [
  { 
    value: 'Under Review', 
    label: 'Under Review', 
    color: '#92400e', 
    bg: '#fffbeb', 
    border: '#fde68a', 
    icon: Clock, 
    badgeClass: 'badge-warning',
    description: 'Sent to customer / Pending review'
  },
  { 
    value: 'Approved', 
    label: 'Approved', 
    color: '#065f46', 
    bg: '#ecfdf5', 
    border: '#a7f3d0', 
    icon: CheckCircle, 
    badgeClass: 'badge-success',
    description: 'Customer approved quotation'
  },
  { 
    value: 'Rejected', 
    label: 'Rejected', 
    color: '#991b1b', 
    bg: '#fef2f2', 
    border: '#fecaca', 
    icon: XCircle, 
    badgeClass: 'badge-danger',
    description: 'Quotation declined or cancelled'
  }
];

const CLEAN_TEMPLATE = {
  estimateNo: '',
  date: '',
  status: 'Under Review',
  placeOfSupply: '',
  customer: '',
  customerAddress: '',
  contactPerson: '',
  contactNo: '',
  customerEmail: '',
  gstin: '',
  state: '',
  spindleSerial: '',
  challanNo: '',
  inwardDate: '',
  scopeOfWork: '',
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
    { id: 1, name: '', hsn: '', qty: 1, unitPrice: 0 }
  ]
};

const DEFAULT_LINAMAR_TEMPLATE = {
  estimateNo: 'QTN/2026-27/294',
  date: '07-09-2026',
  status: 'Under Review',
  placeOfSupply: '23-Madhya Pradesh',
  customer: 'LINAMAR INDIA PRIVATE LIMITED',
  customerAddress: 'Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas, Dewas, Madhya Pradesh-455001, India',
  contactPerson: 'Materials & Plant Maintenance',
  contactNo: '7773877714',
  customerEmail: 'purchase@linamar.com',
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
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'preview' for mobile
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);
  const [isDocExpanded, setIsDocExpanded] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConvertingToPI, setIsConvertingToPI] = useState(false);
  const [clientsList, setClientsList] = useState([]);

  // Searchable Client Directory Picker state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const clientSearchRef = useRef(null);
  const clientSearchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target)) {
        setIsClientSearchOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsClientSearchOpen(false);
    };
    if (isClientSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isClientSearchOpen]);

  useEffect(() => {
    if (!isNewQuoteOpen) {
      setClientSearchQuery('');
      setIsClientSearchOpen(false);
    }
  }, [isNewQuoteOpen]);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clientsList;
    const q = clientSearchQuery.trim().toLowerCase();
    return clientsList.filter(c => {
      const name = (c.company_name || c.name || '').toLowerCase();
      const city = (c.city || '').toLowerCase();
      const gstin = (c.gstin || '').toLowerCase();
      const contact = (c.primary_contact_name || c.contact_person || '').toLowerCase();
      return name.includes(q) || city.includes(q) || gstin.includes(q) || contact.includes(q);
    });
  }, [clientsList, clientSearchQuery]);

  const handleSelectClientFromDirectory = (selected) => {
    if (!selected) return;
    setFormState(prev => ({
      ...prev,
      customer: selected.company_name || selected.name || '',
      customerAddress: selected.billing_address || selected.address || prev.customerAddress,
      contactPerson: selected.primary_contact_name || selected.contact_person || prev.contactPerson,
      contactNo: selected.primary_phone || selected.phone || prev.contactNo,
      customerEmail: selected.primary_email || selected.email || prev.customerEmail,
      gstin: selected.gstin || prev.gstin,
      state: selected.state || prev.state,
      placeOfSupply: selected.state ? (selected.state.includes('-') ? selected.state : `27-${selected.state}`) : prev.placeOfSupply
    }));
    setClientSearchQuery('');
    setIsClientSearchOpen(false);
    if (onNotify) onNotify(`Auto-filled details from Client Directory for ${selected.company_name || selected.name}`);
  };

  const [updatingQuoteId, setUpdatingQuoteId] = useState(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [isMobilePreviewActionsOpen, setIsMobilePreviewActionsOpen] = useState(false);
  const [sidebarStatusMenuQuoteId, setSidebarStatusMenuQuoteId] = useState(null);

  const previewContainerRef = useRef(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Load active clients from Client Directory
  useEffect(() => {
    customerService.getAll().then(res => {
      const list = res?.data || res || [];
      if (Array.isArray(list)) setClientsList(list);
    }).catch(() => {});
  }, []);

  // Listen for pre-fill requests from Client Directory navigation
  useEffect(() => {
    try {
      const prefillRaw = localStorage.getItem('gps_sales_prefill_customer');
      if (prefillRaw) {
        const prefill = JSON.parse(prefillRaw);
        localStorage.removeItem('gps_sales_prefill_customer');
        setEditingQuoteId(null);
        setFormState(prev => ({
          ...prev,
          customer: prefill.customer || '',
          customerAddress: prefill.customerAddress || '',
          contactPerson: prefill.contactPerson || '',
          contactNo: prefill.contactNo || '',
          customerEmail: prefill.customerEmail || '',
          gstin: prefill.gstin || '',
          state: prefill.state || '',
          placeOfSupply: prefill.placeOfSupply || prefill.state || '27-Maharashtra',
          date: new Date().toISOString().split('T')[0]
        }));
        setIsNewQuoteOpen(true);
        if (onNotify) onNotify(`Auto-populated client details from Client Directory for ${prefill.customer}`);
      }
      const filterRaw = localStorage.getItem('gps_sales_filter_customer');
      if (filterRaw) {
        localStorage.removeItem('gps_sales_filter_customer');
        setSearchQuery(filterRaw);
      }
    } catch (_e) {}
  }, [onNotify]);

  const handleFitWidth = useCallback(() => {
    if (previewContainerRef.current) {
      const containerWidth = previewContainerRef.current.clientWidth - 24;
      if (containerWidth > 0 && containerWidth < 794) {
        const calculatedScale = Math.max(0.35, Math.min(1, Number((containerWidth / 794).toFixed(2))));
        setZoomScale(calculatedScale);
      } else {
        setZoomScale(1);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.status-dropdown-container') && !e.target.closest('.sidebar-status-container')) {
        setStatusDropdownOpen(false);
        setSidebarStatusMenuQuoteId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [issuedPIQuotations, setIssuedPIQuotations] = useState(new Set());

  const loadQuotations = async (preferredId = null) => {
    setIsLoading(true);
    setError(null);
    const res = await salesService.getQuotations();
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    }
    
    // Also fetch PIs to check which quotes already have a PI issued
    const piRes = await proformaInvoiceService.getProformaInvoices();
    if (!piRes.error && piRes.data) {
      const piQuoteIds = new Set();
      piRes.data.forEach(pi => {
        if (pi.quotationId) piQuoteIds.add(pi.quotationId);
        
        // Fallback for mock data without dbId: check notes for the string ID
        if (pi.notes && pi.notes.includes('Issued from Quotation')) {
          const match = pi.notes.match(/Issued from Quotation ([\w/-]+)/);
          if (match && match[1]) piQuoteIds.add(match[1]);
        }
      });
      setIssuedPIQuotations(piQuoteIds);
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
  const [formState, setFormState] = useState({ ...CLEAN_TEMPLATE });

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
      // Keep selected quote visible while actively inspecting so it never abruptly vanishes on status change!
      const isCurrentlySelected = selectedQuote && (q.id === selectedQuote.id || q.dbId === selectedQuote.dbId);
      const matchesStatus = 
        statusFilter === 'all'
          ? true
          : (isCurrentlySelected || q.status?.toLowerCase() === statusFilter.toLowerCase());

      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || 
        q.id?.toLowerCase().includes(query) ||
        q.customer?.toLowerCase().includes(query) ||
        (q.spindleSerial && q.spindleSerial.toLowerCase().includes(query)) ||
        (q.contactPerson && q.contactPerson.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [quotations, statusFilter, searchQuery, selectedQuote?.id, selectedQuote?.dbId]);

  // Calculate Dashboard KPI Metrics: Total, Draft, Sent/Under Review, Total Value
  const metrics = useMemo(() => {
    const totalCount = quotations.length;
    const activeQtn = quotations.filter(q => q.status?.toLowerCase() === 'under review').length;
    const sentQtn = quotations.filter(q => q.status?.toLowerCase() === 'sent' || q.status?.toLowerCase() === 'under review').length;
    const totalValue = quotations.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0);

    return { totalCount, activeQtn, sentQtn, totalValue };
  }, [quotations]);

  // Status update function handling Under Review, Approved, Draft, and Rejected with instant 0ms optimistic UI
  const handleUpdateStatus = useCallback(async (quoteId, newStatus) => {
    const targetQuote = quotations.find(q => q.id === quoteId || q.dbId === quoteId);
    if (!targetQuote) return;

    const previousStatus = targetQuote.status;
    if (previousStatus === newStatus) return;

    // 1. Instant 0ms Optimistic UI update (feels instantaneous to user)
    setUpdatingQuoteId(targetQuote.id);

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

    // 2. Non-blocking background persistence
    try {
      const idToUpdate = targetQuote.dbId || targetQuote.id;
      const res = await salesService.updateQuotationStatus(idToUpdate, newStatus);
      if (res && res.error) {
        console.warn(`[SalesScreen] Background status update notice:`, res.error.message);
      }
    } catch (err) {
      console.warn(`[SalesScreen] Background status update sync error:`, err);
    } finally {
      setTimeout(() => {
        setUpdatingQuoteId(prev => (prev === targetQuote.id ? null : prev));
      }, 350);
    }
  }, [quotations, onNotify]);

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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gps_quotations_updated'));
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

  // Reset to clean template
  const handleResetForm = () => {
    setFormState({ ...CLEAN_TEMPLATE });
    onNotify('Form has been cleared and reset.');
  };

  const handleOpenEdit = (quote) => {
    if (!quote) return;
    const targetId = quote.dbId || quote.id;
    setEditingQuoteId(targetId);
    setEditingQuote(quote);
    setFormState({
      estimateNo: quote.estimateNo || quote.quotation_number || quote.id || '',
      date: quote.date || quote.quotation_date || new Date().toISOString().split('T')[0],
      status: quote.status || 'Under Review',
      placeOfSupply: quote.placeOfSupply || quote.place_of_supply || '27-Maharashtra',
      customer: quote.customer || quote.customer_name || '',
      customerId: quote.customerId || quote.customer_id || null,
      dbId: quote.dbId || quote.id || null,
      customerAddress: quote.customerAddress || quote.customer_address || '',
      contactPerson: quote.contactPerson || '',
      contactNo: quote.contactNo || '',
      customerEmail: quote.customerEmail || '',
      gstin: quote.gstin || quote.customer_gstin || '',
      state: quote.state || quote.placeOfSupply || '27-Maharashtra',
      spindleSerial: quote.spindleSerial || quote.spindle_serial || '',
      challanNo: quote.challanNo || 'N/A',
      inwardDate: quote.inwardDate || quote.date || '',
      scopeOfWork: Array.isArray(quote.scopeOfWork)
        ? quote.scopeOfWork.join('\n')
        : (quote.scopeOfWork || ''),
      taxRate: quote.taxRate || 18,
      terms: quote.terms || 'Standard MSME terms apply.',
      notes: quote.notes || '',
      items: quote.items?.length > 0
        ? quote.items.map((it, idx) => ({
            id: it.id || idx + 1,
            name: it.name || it.item_name || it.desc || '',
            desc: it.desc || it.description || it.name || '',
            hsn: it.hsn != null ? String(it.hsn).trim() : (it.hsn_sac_code != null ? String(it.hsn_sac_code).trim() : '998717'),
            qty: Number(it.qty || it.quantity || 1),
            unitPrice: Number(it.unitPrice || it.unit_price || it.rate || 0)
          }))
        : [{ id: 1, name: '', hsn: '998717', qty: 1, unitPrice: 0 }]
    });
    setIsNewQuoteOpen(true);
  };

  // Submit and create or update quotation in live Supabase & local persistence
  const handleCreateQuotation = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formState.customer?.trim()) {
      onNotify('Please enter a Customer / Company name', 'warning');
      return;
    }

    const now = new Date();
    const fy = now.getMonth() >= 3
      ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
      : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;
    const seq = String(Date.now()).slice(-5);

    let qNo;
    if (editingQuoteId) {
      // When editing an existing quotation, ALWAYS keep its current estimate number unless user explicitly edited it
      qNo = formState.estimateNo?.trim() || editingQuote?.estimateNo || editingQuote?.id || editingQuoteId;
    } else {
      // If creating new and the estimateNo is empty or matches default template, generate fresh sequence
      const isDefaultNo = formState.estimateNo === 'QTN/2026-27/294' || !formState.estimateNo?.trim();
      qNo = isDefaultNo ? `QTN/${fy}/${seq}` : formState.estimateNo.trim();
    }

    const scopeLines = (formState.scopeOfWork || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const subtotal = Number(formCalculations.subtotal || 0);
    const totalAmount = Number(formCalculations.totalAmount || 0);

    const quotePayload = {
      quotationNumber: qNo,
      estimateNo: qNo,
      date: formState.date || new Date().toISOString().split('T')[0],
      customerId: formState.customerId || editingQuote?.customerId || editingQuote?.customer_id,
      dbId: formState.dbId || editingQuote?.dbId,
      customerName: formState.customer.trim(),
      customerAddress: formState.customerAddress,
      customerGstin: formState.gstin,
      contactPerson: formState.contactPerson,
      contactNo: formState.contactNo,
      customerEmail: formState.customerEmail,
      placeOfSupply: formState.placeOfSupply || '27-Maharashtra',
      spindleSerial: formState.spindleSerial,
      scopeOfWork: scopeLines,
      subtotal,
      totalAmount,
      status: formState.status || 'Under Review',
      terms: formState.terms,
      notes: formState.notes,
      items: formState.items.map((it, idx) => ({
        id: it.id || idx + 1,
        name: it.name || it.desc || 'Spindle Service Item',
        desc: it.desc || it.name,
        hsn: it.hsn != null ? String(it.hsn).trim() : '84669390',
        qty: Number(it.qty || 1),
        unitPrice: Number(it.unitPrice || it.rate || 0),
        total: Number(it.qty || 1) * Number(it.unitPrice || it.rate || 0)
      }))
    };

    let res;
    if (editingQuoteId) {
      res = await salesService.updateQuotation(editingQuoteId, quotePayload);
    } else {
      res = await salesService.createQuotation(quotePayload);
    }

    if (res && res.error) {
      onNotify(res.error.message || 'Failed to save quotation.', 'error');
      return;
    }

    // Resolve the saved quotation object
    const savedQuote = (res?.data && res.data[0]) || {
      ...quotePayload,
      id: qNo,
      dbId: editingQuote?.dbId || editingQuoteId || qNo,
      customer: formState.customer.trim(),
      state: formState.placeOfSupply || '27-Maharashtra',
      taxRate: 18,
      gstAmount: totalAmount - subtotal
    };

    // Optimistically update the UI state so edits show up IMMEDIATELY
    if (editingQuoteId) {
      setQuotations(prev => {
        const idx = prev.findIndex(q => 
          q.id === editingQuoteId || 
          q.dbId === editingQuoteId || 
          q.estimateNo === editingQuoteId ||
          (editingQuote?.dbId && q.dbId === editingQuote.dbId) ||
          (editingQuote?.estimateNo && q.estimateNo === editingQuote.estimateNo)
        );
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...savedQuote };
          return updated;
        }
        return [savedQuote, ...prev];
      });

      setSelectedQuote(prev => {
        if (!prev) return savedQuote;
        if (
          prev.id === editingQuoteId || 
          prev.dbId === editingQuoteId || 
          prev.estimateNo === editingQuoteId ||
          (editingQuote?.dbId && prev.dbId === editingQuote.dbId) ||
          (editingQuote?.estimateNo && prev.estimateNo === editingQuote.estimateNo)
        ) {
          return { ...prev, ...savedQuote };
        }
        return prev;
      });
    } else {
      setQuotations(prev => [savedQuote, ...prev]);
      setSelectedQuote(savedQuote);
    }

    setStatusFilter('all');
    setSearchQuery('');
    setIsNewQuoteOpen(false);
    setEditingQuoteId(null);
    setEditingQuote(null);
    onNotify(editingQuoteId ? `Estimate ${qNo} updated successfully` : `Estimate ${qNo} created successfully for ${formState.customer}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gps_quotations_updated'));
    }
    await loadQuotations(qNo);
  };

  const handlePrint = async () => {
    if (!selectedQuote) return;
    try {
      await exportQuotationPdf(selectedQuote, 'print');
      if (onNotify) onNotify(`Opening Quotation Estimate ${selectedQuote.estimateNo || selectedQuote.id} for printing`);
    } catch (err) {
      console.error('Failed to print quotation PDF:', err);
      if (onNotify) onNotify('PDF print failed. Please try again.', 'error');
    }
  };

  const handleDownload = async () => {
    if (!selectedQuote) return;
    try {
      await exportQuotationPdf(selectedQuote, 'download');
      if (onNotify) onNotify(`Quotation Estimate ${selectedQuote.estimateNo || selectedQuote.id} downloaded (PDF)`);
    } catch (err) {
      console.error('Failed to export quotation PDF:', err);
      if (onNotify) onNotify('PDF export failed. Please try again.', 'error');
    }
  };

  const handleConvertToProformaInvoice = async () => {
    if (!selectedQuote) return;
    setIsConvertingToPI(true);
    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const dueD = new Date();
      dueD.setDate(dueD.getDate() + 15);
      const dueDD = String(dueD.getDate()).padStart(2, '0');
      const dueMM = String(dueD.getMonth() + 1).padStart(2, '0');
      const dueYYYY = dueD.getFullYear();
      const dueStr = `${dueYYYY}-${dueMM}-${dueDD}`;

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const newPINumber = `PI/2026-27/${randomSuffix}`;

      const items = (selectedQuote.items || []).map((it, idx) => ({
        id: idx + 1,
        name: it.name || it.item_name || 'Spindle Service / Component',
        hsn: it.hsn || it.hsn_sac || '84669390',
        qty: Number(it.qty || it.quantity || 1),
        unitPrice: Number(it.unitPrice || it.rate || it.unit_price || 0)
      }));

      const subtotal = items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
      const gstAmount = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + gstAmount;

      const piPayload = {
        piNumber: newPINumber,
        customerId: selectedQuote.customerId || selectedQuote.customer_id || null,
        customerName: selectedQuote.customer || selectedQuote.customerFullName || 'Valued Customer',
        customerEmail: selectedQuote.customerEmail || '',
        customerAddress: selectedQuote.customerAddress || selectedQuote.billingAddress || '',
        customerGstin: selectedQuote.gstin || '',
        placeOfSupply: selectedQuote.placeOfSupply || selectedQuote.state || '27-Maharashtra',
        contactNo: selectedQuote.contactNo || selectedQuote.customerContact || '',
        spindleSerial: selectedQuote.spindleSerial || '',
        salesOrder: selectedQuote.salesOrder || selectedQuote.poNumber || 'VERBAL',
        scopeOfWork: selectedQuote.scopeOfWork || '',
        quotationId: selectedQuote.dbId || null,
        piDate: todayStr,
        validUntil: dueStr,
        paymentTerms: '50% Advance with Proforma, 50% against Dispatch Inspection',
        subtotal: subtotal,
        totalAmount: totalAmount,
        status: 'Ready to Send',
        terms: selectedQuote.terms || 'Standard MSME terms apply.',
        notes: `Issued from Quotation ${selectedQuote.estimateNo || selectedQuote.id}`,
        items: items
      };

      const res = await proformaInvoiceService.createProformaInvoice(piPayload);
      if (res.error) {
        if (onNotify) onNotify(`Failed to create Proforma Invoice: ${res.error.message || 'Database error'}`, 'error');
      } else {
        // Auto-approve the quotation since it's converted to an order/PI
        await handleUpdateStatus(selectedQuote.dbId || selectedQuote.id, 'Approved');
        
        setIssuedPIQuotations(prev => {
          const newSet = new Set(prev);
          if (selectedQuote.dbId) newSet.add(selectedQuote.dbId);
          newSet.add(selectedQuote.estimateNo || selectedQuote.id);
          return newSet;
        });
        
        if (onNotify) onNotify(`Proforma Invoice ${newPINumber} issued successfully and Quotation was Approved!`, 'success');
        if (onNavigate) {
          onNavigate('proforma-invoices');
        }
      }
    } catch (err) {
      console.error('Error converting Quotation to PI:', err);
      if (onNotify) onNotify('Conversion failed due to an unexpected error.', 'error');
    } finally {
      setIsConvertingToPI(false);
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
          badge="Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {error.isRlsDenied ? 'Access Restricted' : 'Connection Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {error.message || 'Unable to retrieve commercial quotations. Please check your connection.'}
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
              ...CLEAN_TEMPLATE,
              estimateNo: `QTN/${fy}/${seq}`,
              date: now.toISOString().split('T')[0],
              status: 'Under Review'
            });
            setIsNewQuoteOpen(true);
          }}
        >
          <Plus size={14} />
          <span className="desktop-only-inline">New Quotation</span>
          <span className="mobile-only-inline">New Quote</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* Top KPI Metric Cards: Total Quotes, Active, Sent, Total Value */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Quotations</span>
              <div className="metric-icon-wrap"><FileText size={16} /></div>
            </div>
            <div className="metric-value">{metrics.totalCount}</div>
            <div className="metric-footer" style={{ color: 'var(--primary)' }}>Sales registry</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Active Quotes</span>
              <div className="metric-icon-wrap"><CheckCircle size={16} /></div>
            </div>
            <div className="metric-value">{metrics.activeQtn}</div>
            <div className="metric-footer" style={{ color: '#d97706' }}>In progress or review</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Sent Quotes</span>
              <div className="metric-icon-wrap"><Send size={16} /></div>
            </div>
            <div className="metric-value">{metrics.sentQtn}</div>
            <div className="metric-footer" style={{ color: '#0284c7' }}>Transmitted to clients</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Value</span>
              <div className="metric-icon-wrap"><DollarSign size={16} /></div>
            </div>
            <div className="metric-value">₹{metrics.totalValue.toLocaleString('en-IN')}</div>
            <div className="metric-footer" style={{ color: '#7A1F3D' }}>Total pipeline volume</div>
          </div>
        </div>

        {/* Mobile View Switcher (Quotations List vs Document Preview) */}
        <div className="mobile-only-flex sales-mobile-tabs">
          <button
            type="button"
            className={`sales-mobile-tab-btn ${mobileTab === 'list' ? 'active' : ''}`}
            onClick={() => setMobileTab('list')}
          >
            <FileText size={14} />
            <span>Quotations ({filteredQuotes.length})</span>
          </button>
          <button
            type="button"
            className={`sales-mobile-tab-btn ${mobileTab === 'preview' ? 'active' : ''}`}
            onClick={() => {
              if (!selectedQuote && filteredQuotes.length > 0) {
                setSelectedQuote(filteredQuotes[0]);
              }
              setMobileTab('preview');
            }}
          >
            <Eye size={14} />
            <span>Document Preview</span>
          </button>
        </div>

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
          <div className={`section-card sales-col-list ${mobileTab !== 'list' ? 'mobile-hidden' : ''}`} style={{ height: 'fit-content', padding: '0', overflow: 'hidden' }}>
            {/* Filter Header */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>Quotations ({filteredQuotes.length})</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Select to preview</span>
              </div>
              
              <div className="search-input-wrap" style={{ width: '100%', position: 'relative' }}>
                <Search size={14} className="search-icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Search Quote #, Customer, Serial..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', height: '32px', fontSize: '12px', paddingLeft: '32px', paddingRight: searchQuery ? '28px' : '10px', boxSizing: 'border-box' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--text-muted)'
                    }}
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div style={{ width: '100%' }}>
                <CustomSelect 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  size="sm"
                  style={{ width: '100%', height: '32px' }}
                >
                  <option value="all">All Statuses ({quotations.length})</option>
                  <option value="under review">Under Review ({quotations.filter(q => q.status?.toLowerCase() === 'under review').length})</option>
                  <option value="approved">Approved ({quotations.filter(q => q.status?.toLowerCase() === 'approved').length})</option>
                  <option value="rejected">Rejected ({quotations.filter(q => q.status?.toLowerCase() === 'rejected').length})</option>
                </CustomSelect>
              </div>
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
                      onClick={() => {
                        setSelectedQuote(q);
                        setMobileTab('preview');
                        setIsMobilePreviewActionsOpen(false);
                        setTimeout(handleFitWidth, 50);
                      }}
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

                        {/* Interactive Sidebar Status Pill with Quick Switcher */}
                        <div style={{ position: 'relative' }} className="sidebar-status-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSidebarStatusMenuQuoteId(prev => (prev === q.id ? null : q.id));
                            }}
                            title={`Status: ${q.status}. Click to change.`}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              borderRadius: '12px',
                              outline: 'none'
                            }}
                          >
                            {updatingQuoteId === q.id ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>
                                <Loader2 size={11} className="animate-spin" />
                                <span>Updating...</span>
                              </span>
                            ) : (
                              <>
                                <StatusBadge status={q.status} size="sm" />
                                <ChevronDown size={10} color="var(--text-muted)" style={{ opacity: 0.6 }} />
                              </>
                            )}
                          </button>

                          {/* Quick Status Dropdown in Sidebar */}
                          {sidebarStatusMenuQuoteId === q.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                right: 0,
                                zIndex: 120,
                                minWidth: '150px',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                animation: 'fadeIn 0.12s ease-out'
                              }}
                            >
                              <div style={{ padding: '3px 6px', fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Change Status
                              </div>
                              {QUOTE_STATUS_OPTIONS.map(opt => {
                                const isCurrent = q.status === opt.value;
                                const Icon = opt.icon;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(q.id, opt.value);
                                      setSidebarStatusMenuQuoteId(null);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '5px 8px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      background: isCurrent ? opt.bg : 'transparent',
                                      color: opt.color,
                                      fontSize: '11px',
                                      fontWeight: isCurrent ? 700 : 500,
                                      cursor: 'pointer',
                                      textAlign: 'left'
                                    }}
                                    onMouseEnter={e => {
                                      if (!isCurrent) e.currentTarget.style.background = 'var(--bg-surface-subtle)';
                                    }}
                                    onMouseLeave={e => {
                                      if (!isCurrent) e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Icon size={11} color={opt.color} />
                                      <span>{opt.label}</span>
                                    </span>
                                    {isCurrent && <Check size={11} color={opt.color} />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
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
                            style={{ height: '26px', padding: '0 8px', fontSize: '11px', gap: '3px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedQuote(q);
                              setMobileTab('preview');
                              setIsMobilePreviewActionsOpen(false);
                              setTimeout(handleFitWidth, 50);
                            }}
                            title="Preview Estimate"
                          >
                            <Eye size={11} />
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
            <div className={`section-card sales-col-preview ${mobileTab !== 'preview' ? 'mobile-hidden' : ''}`} style={{ padding: '0', overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Top Action Header with Under Review, Approved, Draft, and Rejected Functions */}
              <div className="sales-preview-toolbar">
                {/* Top Row: Navigation, ID, Status, Customer and Mobile Actions Toggle */}
                <div className="sales-preview-top-row">
                  <div className="sales-preview-id-group">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm mobile-only-inline sales-mobile-back-btn"
                      onClick={() => setMobileTab('list')}
                      style={{ height: '26px', fontSize: '11px', padding: '0 7px', gap: '4px', flexShrink: 0 }}
                      title="Back to Quotations List"
                    >
                      <ChevronLeft size={13} />
                      <span>List</span>
                    </button>

                    <span className="mono sales-preview-quote-id" style={{ fontWeight: 700, fontSize: '12.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>{selectedQuote.id}</span>
                  </div>

                  <div className="sales-preview-status-customer-wrap">
                    {/* Interactive Status Changer Dropdown */}
                    <div style={{ position: 'relative' }} className="status-dropdown-container">
                      <button 
                        type="button" 
                        onClick={() => setStatusDropdownOpen(prev => !prev)}
                        title={`Status is "${selectedQuote.status}". Click to switch to Under Review, Approved, or Rejected.`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '2px 7px',
                          borderRadius: '16px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-surface)',
                          cursor: 'pointer',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease',
                          height: '24px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        {updatingQuoteId === selectedQuote.id ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '10.5px' }}>
                            <Loader2 size={11} className="animate-spin" />
                            <span>Updating...</span>
                          </span>
                        ) : (
                          <StatusBadge status={selectedQuote.status} size="sm" />
                        )}
                        <ChevronDown size={10} color="var(--text-muted)" style={{ transition: 'transform 0.2s ease', transform: statusDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                      </button>

                      {statusDropdownOpen && (
                        <div 
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            zIndex: 100,
                            minWidth: '220px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            animation: 'fadeIn 0.15s ease-out'
                          }}
                        >
                          <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Change Quotation Status
                          </div>
                          {QUOTE_STATUS_OPTIONS.map(opt => {
                            const isCurrent = selectedQuote.status === opt.value;
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  handleUpdateStatus(selectedQuote.id, opt.value);
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
                                  textAlign: 'left',
                                  transition: 'all 0.12s ease'
                                }}
                                onMouseEnter={e => {
                                  if (!isCurrent) e.currentTarget.style.background = 'var(--bg-surface-subtle)';
                                }}
                                onMouseLeave={e => {
                                  if (!isCurrent) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Icon size={13} color={opt.color} />
                                  <div>
                                    <div style={{ lineHeight: 1.2 }}>{opt.label}</div>
                                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 400 }}>{opt.description}</div>
                                  </div>
                                </div>
                                {isCurrent && <Check size={13} color={opt.color} />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <span className="sales-preview-customer-label">
                      <span className="desktop-only-inline">• </span>
                      <span className="mobile-only-inline" style={{ color: 'var(--text-muted)' }}>Customer: </span>
                      <strong style={{ color: 'var(--text-main)' }}>{selectedQuote.customer}</strong>
                    </span>
                  </div>

                  {/* Actions button for mobile screens */}
                  <button
                    type="button"
                    className="sales-preview-actions-toggle-mobile"
                    onClick={() => setIsMobilePreviewActionsOpen(prev => !prev)}
                    aria-expanded={isMobilePreviewActionsOpen}
                    title={isMobilePreviewActionsOpen ? 'Hide action buttons' : 'Show action buttons'}
                  >
                    <span>Actions</span>
                    {isMobilePreviewActionsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* Action Buttons Group */}
                <div className={`sales-preview-actions-group ${isMobilePreviewActionsOpen ? 'is-open' : 'is-collapsed'}`}>
                  {/* Removed Contextual 1-Click Status Workflow Actions in favor of upper dropdown */}
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm sales-btn-email"
                    onClick={() => handleOpenEmailForQuote(selectedQuote)}
                    title="Send quotation via Outlook-style email composer"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                  >
                    <Mail size={12} color="var(--primary)" />
                    <span className="desktop-only-inline">Send Email</span>
                    <span className="mobile-only-inline">Email</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm sales-btn-pi"
                    onClick={(issuedPIQuotations.has(selectedQuote?.dbId) || issuedPIQuotations.has(selectedQuote?.estimateNo || selectedQuote?.id)) ? () => { if (onNavigate) onNavigate('proforma-invoices'); } : handleConvertToProformaInvoice}
                    disabled={isConvertingToPI}
                    title={(issuedPIQuotations.has(selectedQuote?.dbId) || issuedPIQuotations.has(selectedQuote?.estimateNo || selectedQuote?.id)) ? "A Proforma Invoice has already been issued. Click to view Proforma Invoices." : "Issue Proforma Invoice from this Quotation"}
                    style={{ 
                      height: '28px', 
                      fontSize: '11px', 
                      padding: '0 10px', 
                      gap: '5px',
                      background: (issuedPIQuotations.has(selectedQuote?.dbId) || issuedPIQuotations.has(selectedQuote?.estimateNo || selectedQuote?.id)) 
                        ? 'var(--bg-surface-subtle)' 
                        : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: (issuedPIQuotations.has(selectedQuote?.dbId) || issuedPIQuotations.has(selectedQuote?.estimateNo || selectedQuote?.id)) 
                        ? 'var(--primary)' 
                        : '#ffffff',
                      border: (issuedPIQuotations.has(selectedQuote?.dbId) || issuedPIQuotations.has(selectedQuote?.estimateNo || selectedQuote?.id)) 
                        ? '1px solid var(--border-color)' 
                        : 'none',
                      fontWeight: 600,
                      boxShadow: (issuedPIQuotations.has(selectedQuote?.dbId) || issuedPIQuotations.has(selectedQuote?.estimateNo || selectedQuote?.id)) 
                        ? 'none' 
                        : '0 1px 3px rgba(2, 132, 199, 0.25)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isConvertingToPI ? (
                      <>
                        <Loader2 size={12} className="spin" />
                        <span>Issuing...</span>
                      </>
                    ) : (issuedPIQuotations.has(selectedQuote?.dbId) || issuedPIQuotations.has(selectedQuote?.estimateNo || selectedQuote?.id)) ? (
                      <>
                        <Eye size={12} color="var(--primary)" />
                        <span className="desktop-only-inline">View Proforma Invoice</span>
                        <span className="mobile-only-inline">View PI</span>
                      </>
                    ) : (
                      <>
                        <FileCheck size={12} />
                        <span className="desktop-only-inline">Issue Proforma Invoice</span>
                        <span className="mobile-only-inline">Issue PI</span>
                      </>
                    )}
                  </button>

                  <div className="sales-preview-divider" style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 2px' }} />

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm sales-btn-download"
                    onClick={handleDownload}
                    title="Download official Estimate / Invoice PDF"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                  >
                    <Download size={12} />
                    <span className="desktop-only-inline">Download PDF</span>
                    <span className="mobile-only-inline">PDF</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm sales-btn-print"
                    onClick={handlePrint}
                    title="Print official Estimate / Invoice"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                  >
                    <Printer size={12} />
                    <span>Print</span>
                  </button>

                  {/* Zoom & Fit Controls Bar */}
                  <div 
                    className="sales-preview-zoom-controls" 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      background: 'var(--bg-surface)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '6px', 
                      height: '26px', 
                      padding: '1px 4px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Left Side: Zoom Out / Percentage / Zoom In */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setZoomScale(prev => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
                        title="Zoom Out (reduce scale)"
                        style={{ 
                          background: 'var(--bg-surface-subtle)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '4px',
                          padding: '0 6px', 
                          cursor: 'pointer', 
                          height: '22px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '2px',
                          color: 'var(--text-main)',
                          fontSize: '10.5px',
                          fontWeight: 500
                        }}
                      >
                        <ZoomOut size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoomScale(1)}
                        title="Reset to 100% (Actual Desktop Size)"
                        style={{ 
                          background: 'transparent', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '4px',
                          padding: '0 6px', 
                          cursor: 'pointer', 
                          height: '22px', 
                          fontSize: '10.5px', 
                          fontWeight: 700, 
                          color: 'var(--text-main)', 
                          minWidth: '42px',
                          textAlign: 'center'
                        }}
                      >
                        {Math.round(zoomScale * 100)}%
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoomScale(prev => Math.min(1.5, Number((prev + 0.1).toFixed(2))))}
                        title="Zoom In (enlarge scale)"
                        style={{ 
                          background: 'var(--bg-surface-subtle)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '4px',
                          padding: '0 6px', 
                          cursor: 'pointer', 
                          height: '22px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '2px',
                          color: 'var(--text-main)',
                          fontSize: '10.5px',
                          fontWeight: 500
                        }}
                      >
                        <ZoomIn size={12} />
                      </button>
                    </div>

                    {/* Right Side: Fit Button */}
                    <button
                      type="button"
                      onClick={handleFitWidth}
                      title="Fit quotation to screen width"
                      style={{ 
                        background: 'var(--primary-bg, #fdf2f4)', 
                        border: '1px solid rgba(122, 31, 61, 0.25)', 
                        borderRadius: '4px',
                        padding: '0 8px', 
                        cursor: 'pointer', 
                        height: '22px', 
                        fontSize: '10.5px', 
                        color: 'var(--primary, #7A1F3D)', 
                        fontWeight: 600, 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Maximize2 size={11} />
                      <span>Fit</span>
                    </button>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm sales-btn-expand"
                    onClick={() => setIsDocExpanded(!isDocExpanded)}
                    title={isDocExpanded ? "Split view" : "Full screen preview"}
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                  >
                    {isDocExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    <span className="desktop-only-inline">{isDocExpanded ? "Split View" : "Full Screen"}</span>
                    <span className="mobile-only-inline">{isDocExpanded ? "Split" : "Expand"}</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm sales-btn-edit"
                    onClick={() => handleOpenEdit(selectedQuote)}
                    title="Edit Quotation details"
                    style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                  >
                    <Edit3 size={12} />
                    <span>Edit</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-sm sales-preview-delete-btn"
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

            {/* Document Body — A4 Page Preview (Identical to Desktop View) */}
            <div 
              ref={previewContainerRef}
              style={{ 
                background: 'transparent', 
                padding: '16px 8px', 
                overflowY: 'auto', 
                overflowX: 'auto', 
                WebkitOverflowScrolling: 'touch',
                flex: 1, 
                minHeight: '0',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div 
                style={{ 
                  width: 'max-content',
                  minWidth: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: '100%',
                  boxSizing: 'border-box'
                }}
              >
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
                    boxShadow: 'none',
                    border: '1px solid var(--border-color)',
                    boxSizing: 'border-box',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    margin: '0 auto',
                    flexShrink: 0,
                    zoom: zoomScale !== 1 ? zoomScale : undefined
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
                  <div className="preview-header-grid" style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
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
                          <Phone size={8} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '2px' }} />+919764252188 / 9764032929<br />
                          Email: process@gpsspindles.net<br />
                          GSTIN: 27AATFG1527D1ZF<br />
                          State: 27-Maharashtra
                        </div>
                      </div>
                    </div>

                    {/* Right: Metadata Grid (3 rows: Row 1 = Estimate No/Date, Row 2 = Place of supply/empty corner, Row 3 = empty bottom space) */}
                    <div style={{ borderLeft: '1px solid #b8b8b8', display: 'flex', flexDirection: 'column' }}>
                      {/* Row 1: Estimate No. & Date */}
                      <div className="preview-meta-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
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
                      <div className="preview-meta-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
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
                        <div className="preview-amounts-grid" style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
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

                            <div style={{ borderTop: '1px solid #b8b8b8', margin: '4px -10px' }} />

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
                        <div className="preview-footer-grid" style={{ display: 'grid', gridTemplateColumns: '29% 41% 30%', fontSize: '7.2px', color: '#000000', flex: 1, minHeight: 0 }}>
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
        </div>
        );
      })()}

      {!selectedQuote && (
        <div className={`section-card sales-col-preview ${mobileTab !== 'preview' ? 'mobile-hidden' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
        onClose={() => {
          setIsNewQuoteOpen(false);
          setEditingQuoteId(null);
          setEditingQuote(null);
        }}
        title={editingQuoteId ? `Edit Estimate / Quotation ${formState.estimateNo}` : "Create New Precision Spindle Estimate / Quotation (Official GPS Format)"}
        maxWidth="920px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleResetForm}
              title="Clear all fields in this form"
            >
              <RefreshCw size={12} />
              <span>Reset / Clear Form</span>
            </button>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  setIsNewQuoteOpen(false);
                  setEditingQuoteId(null);
                  setEditingQuote(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={handleCreateQuotation}
              >
                <CheckCircle size={13} />
                <span>{editingQuoteId ? 'Save Changes' : 'Generate Quotation'}</span>
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
                  autoComplete="off"
                  spellCheck={false}
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
                  autoComplete="off"
                  spellCheck={false}
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
                  autoComplete="off"
                  spellCheck={false}
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
                  value={formState.status || 'Under Review'}
                  onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                  style={{ height: '28px', fontSize: '11px', fontWeight: 600 }}
                >
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Estimate For (Customer / Buyer Details) */}
          <div style={{ padding: '8px 10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Building2 size={12} color="#7A1F3D" />
                <span>Estimate For (Customer / Buyer Details)</span>
              </div>
              {clientsList.length > 0 && (
                <div ref={clientSearchRef} className="sales-client-search-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Client Directory:</span>
                  
                  <div
                    className="sales-client-search-input-box"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      background: '#ffffff',
                      border: isClientSearchOpen ? '1.5px solid #7A1F3D' : '1px solid #cbd5e1',
                      borderRadius: '5px',
                      padding: '0 8px',
                      height: '28px',
                      minWidth: '180px',
                      maxWidth: '300px',
                      boxShadow: isClientSearchOpen ? '0 0 0 3px rgba(122, 31, 61, 0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                      cursor: 'text'
                    }}
                    onClick={() => {
                      setIsClientSearchOpen(true);
                      setTimeout(() => clientSearchInputRef.current?.focus(), 20);
                    }}
                  >
                    <Search size={12} color={isClientSearchOpen ? '#7A1F3D' : '#64748b'} style={{ flexShrink: 0, marginRight: '6px' }} />
                    <input
                      ref={clientSearchInputRef}
                      type="text"
                      placeholder={isClientSearchOpen ? "Type client name, city..." : "Auto-Fill from Client Directory"}
                      value={clientSearchQuery}
                      onChange={(e) => {
                        setClientSearchQuery(e.target.value);
                        if (!isClientSearchOpen) setIsClientSearchOpen(true);
                      }}
                      onFocus={() => setIsClientSearchOpen(true)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#1e293b',
                        width: '100%',
                        height: '100%',
                        padding: 0,
                        lineHeight: '28px'
                      }}
                    />
                    {clientSearchQuery ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientSearchQuery('');
                          clientSearchInputRef.current?.focus();
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#94a3b8'
                        }}
                        title="Clear search"
                      >
                        <X size={12} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsClientSearchOpen(prev => !prev);
                          if (!isClientSearchOpen) {
                            setTimeout(() => clientSearchInputRef.current?.focus(), 20);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#64748b'
                        }}
                      >
                        <ChevronDown
                          size={13}
                          style={{
                            transform: isClientSearchOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s ease'
                          }}
                        />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {isClientSearchOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        right: 0,
                        width: 'min(320px, calc(100vw - 32px))',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 10px 25px -5px rgba(122, 31, 61, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        zIndex: 9999,
                        padding: '4px'
                      }}
                    >
                      <div style={{
                        padding: '4px 8px 6px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: '#64748b',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>CLIENT DIRECTORY ({filteredClients.length})</span>
                        {clientSearchQuery && (
                          <span style={{ color: '#7A1F3D', fontWeight: 600 }}>Filter: "{clientSearchQuery}"</span>
                        )}
                      </div>

                      {filteredClients.length === 0 ? (
                        <div style={{ padding: '14px 8px', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>
                          No clients matching "{clientSearchQuery}"
                        </div>
                      ) : (
                        filteredClients.map((client) => {
                          const name = client.company_name || client.name;
                          const isSelected = formState.customer && formState.customer.trim().toLowerCase() === name.trim().toLowerCase();
                          return (
                            <div
                              key={client.id || name}
                              onClick={() => handleSelectClientFromDirectory(client)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                background: isSelected ? '#fdf2f4' : 'transparent',
                                borderLeft: isSelected ? '3px solid #7A1F3D' : '3px solid transparent',
                                transition: 'background 0.12s ease',
                                marginBottom: '2px'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 600, fontSize: '11px', color: isSelected ? '#7A1F3D' : '#1e293b' }}>
                                  {name}
                                </span>
                                {client.city && (
                                  <span style={{ fontSize: '9px', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '3px' }}>
                                    {client.city}
                                  </span>
                                )}
                              </div>
                              {(client.primary_contact_name || client.gstin) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
                                  {client.primary_contact_name && <span>{client.primary_contact_name}</span>}
                                  {client.primary_contact_name && client.gstin && <span>•</span>}
                                  {client.gstin && <span>GST: {client.gstin}</span>}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
              <div className="form-group form-group-col-span" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '10px' }}>Customer Legal Entity Name *</label>
                <input 
                  type="text" 
                  name="gps_customer_entity_name"
                  id="gps_customer_entity_name"
                  className="form-control" 
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
                  value={formState.customer}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormState(prev => ({ ...prev, customer: val }));
                    const matched = clientsList.find(c => (c.company_name || c.name || '').trim().toLowerCase() === val.trim().toLowerCase());
                    if (matched) {
                      setFormState(prev => ({
                        ...prev,
                        customer: matched.company_name || matched.name,
                        customerAddress: matched.billing_address || matched.address || prev.customerAddress,
                        contactPerson: matched.primary_contact_name || matched.contact_person || prev.contactPerson,
                        contactNo: matched.primary_phone || matched.phone || prev.contactNo,
                        customerEmail: matched.primary_email || matched.email || prev.customerEmail,
                        gstin: matched.gstin || prev.gstin,
                        state: matched.state || prev.state,
                        placeOfSupply: matched.state ? (matched.state.includes('-') ? matched.state : `27-${matched.state}`) : prev.placeOfSupply
                      }));
                    }
                  }}
                  placeholder="e.g. LINAMAR INDIA PRIVATE LIMITED (or select from Client Directory above)"
                  style={{ height: '28px', fontSize: '11px' }}
                  required
                />
              </div>

              <div className="form-group form-group-col-span" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '10px' }}>Factory / Plant Physical Address</label>
                <input 
                  type="text" 
                  name="gps_customer_plant_address"
                  className="form-control" 
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={formState.customerAddress}
                  onChange={(e) => setFormState({ ...formState, customerAddress: e.target.value })}
                  placeholder="Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas..."
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Contact Person Name</label>
                <input 
                  type="text" 
                  name="gps_contact_person_name"
                  className="form-control" 
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={formState.contactPerson || ''}
                  onChange={(e) => setFormState({ ...formState, contactPerson: e.target.value })}
                  placeholder="e.g. Materials & Maintenance Head"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Contact Phone / Mobile</label>
                <input 
                  type="text" 
                  name="gps_contact_phone_number"
                  className="form-control mono" 
                  autoComplete="off"
                  spellCheck={false}
                  value={formState.contactNo}
                  onChange={(e) => setFormState({ ...formState, contactNo: e.target.value })}
                  placeholder="e.g. 7773877714"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Direct Email Address</label>
                <input 
                  type="email" 
                  name="gps_contact_email_address"
                  className="form-control mono" 
                  autoComplete="off"
                  spellCheck={false}
                  value={formState.customerEmail || ''}
                  onChange={(e) => setFormState({ ...formState, customerEmail: e.target.value })}
                  placeholder="e.g. purchase@company.com"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Customer GSTIN</label>
                <input 
                  type="text" 
                  name="gps_customer_gstin"
                  className="form-control mono" 
                  autoComplete="off"
                  spellCheck={false}
                  value={formState.gstin}
                  onChange={(e) => setFormState({ ...formState, gstin: e.target.value })}
                  placeholder="e.g. 23AACCL5351J1ZM"
                  style={{ height: '28px', fontSize: '11px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Customer State / Place of Supply</label>
                <input 
                  type="text" 
                  name="gps_customer_supply_state"
                  className="form-control" 
                  autoComplete="off"
                  spellCheck={false}
                  value={formState.state}
                  onChange={(e) => setFormState({ ...formState, state: e.target.value, placeOfSupply: e.target.value })}
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

            <div className="sales-job-id-grid">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '10px' }}>Serial No.</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  autoComplete="off" 
                  spellCheck={false}
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
                  autoComplete="off" 
                  spellCheck={false}
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
                  autoComplete="off" 
                  spellCheck={false}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <DollarSign size={12} color="#7A1F3D" />
                <span>Line Items (# Item name, HSN/SAC, Quantity, Price/Unit, Amount)</span>
                <span className="mobile-only-inline" style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>(Swipe to edit items →)</span>
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

            <div className="table-responsive sales-items-table-wrapper">
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
          <div className="sales-totals-grid">
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
