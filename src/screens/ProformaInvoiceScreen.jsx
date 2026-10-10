import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { proformaInvoiceService, DEFAULT_TTB_PROFORMA } from '../services/database/proformaInvoiceService';
import { salesService } from '../services/database/salesService';
import { invoiceService } from '../services/database/invoiceService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { 
  exportProformaInvoicePdf, 
  exportProformaInvoiceRegisterPdf,
  numberToIndianWords
} from '../utils/pdfGenerator';
import UpiQrCode from '../components/common/UpiQrCode';
import { getActiveUpiId } from '../utils/upiQrGenerator';
import { 
  Search, Plus, Eye, Printer, FileText, Send, 
  Download, Trash2, Edit3, Check, X, Building2, 
  User, Phone, MapPin, Mail, Clock, ShoppingCart, 
  CheckCircle2, AlertCircle, Calendar, DollarSign,
  ChevronRight, ArrowRight, ShieldCheck, Link2, RefreshCw,
  Maximize2, Minimize2, CheckCircle, XCircle, FileCheck, Loader2, Sparkles
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';

const PRESET_CUSTOMERS = [
  {
    name: 'T T B TOOLING',
    fullName: 'T T B TOOLING',
    contact: '9975108709',
    email: 'purchase@ttbtooling.com',
    billingAddress: 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan\nPune, Maharashtra-410501\nIndia',
    gstin: '27AAKFT2876K1ZI',
    state: '27-Maharashtra',
    defaultSO: 'SO-2026-027'
  },
  {
    name: 'LINAMAR INDIA PRIVATE LIMITED',
    fullName: 'LINAMAR INDIA PRIVATE LIMITED',
    contact: '7773877714',
    email: 'purchase@linamar.com',
    billingAddress: 'Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas\nDewas, Madhya Pradesh-455001\nIndia',
    gstin: '23AACCL5351J1ZM',
    state: '23-Madhya Pradesh',
    defaultSO: 'SO-2026-294'
  },
  {
    name: 'Tata Advanced Systems',
    fullName: 'Tata Advanced Systems Ltd',
    contact: 'Mr. Tanmay Sharma (DGM - Procurement)',
    email: 'tanmay@tataadvanced.com',
    billingAddress: 'Aerospace Special Economic Zone, Hardware Park, Adibatla, Hyderabad, Telangana - 501510',
    gstin: '36AAACT2718E1ZQ',
    state: '36-Telangana',
    defaultSO: 'SO-2026-041'
  },
  {
    name: 'Bharat Forge',
    fullName: 'Bharat Forge Ltd',
    contact: 'Mr. Sunil Kadam (DGM - Maintenance & Tooling)',
    email: 'procurement@bharatforge.com',
    billingAddress: 'Mundhwa, Pune Cantonment, Pune - 411036, Maharashtra, India',
    gstin: '27AAACB1829D1Z2',
    state: '27-Maharashtra',
    defaultSO: 'SO-2026-045'
  }
];

export default function ProformaInvoiceScreen({ onNavigate, onNotify }) {
  const [proformaInvoices, setProformaInvoices] = useState([]);
  const [selectedPI, setSelectedPI] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDocExpanded, setIsDocExpanded] = useState(false);

  // Approved Quotations for conversion selector
  const [approvedQuotations, setApprovedQuotations] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

  // Modals & Editing
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPIId, setEditingPIId] = useState(null);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [emailDoc, setEmailDoc] = useState(null);
  const [piToDelete, setPiToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConvertingToTaxInvoice, setIsConvertingToTaxInvoice] = useState(false);

  // Form State for Create / Edit PI
  const [formState, setFormState] = useState({
    piNumber: '',
    customer: 'T T B TOOLING',
    customerEmail: 'purchase@ttbtooling.com',
    customerContact: '9975108709',
    billingAddress: 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan\nPune, Maharashtra-410501\nIndia',
    gstin: '27AAKFT2876K1ZI',
    placeOfSupply: '27-Maharashtra',
    salesOrder: 'SO-2026-027',
    piDate: '22-08-2026',
    validUntil: '06-09-2026',
    spindleSerial: 'HMMXXVI (M77-002)',
    challanNo: '049',
    challanDate: '18-08-2026',
    scopeOfWork: `1. DISMENTAL\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. DRAWBAR HARDCHROME\n6. DRAWBAR RECONDITIONING\n7. DISC SPRING REPLACEMENT\n8. TAPER GRINDING\n9. SHAFT BALANCING\n10. DYNAMIC RUN TEST`,
    paymentTerms: '50% Advance with Proforma, 50% against Dispatch Inspection',
    terms: 'Thanks for doing business with us!',
    quotationId: null,
    items: [
      { id: 1, name: 'RECONDITIONING CHARGES FOR SPINDLE (M77-002)', hsn: '84669390', qty: 1, unit: '-', unitPrice: 33500 },
      { id: 2, name: '7014CTYNSULP4 NSK (SET OF 4 )', hsn: '84821012', qty: 1, unit: 'SET', unitPrice: 22500 },
      { id: 3, name: 'TRANSPORT CHARGES', hsn: '996511', qty: 1, unit: '-', unitPrice: 3500 },
      { id: 4, name: 'DRAWBAR ASSEMBLY WITH DISC SPRING (MUBEA MAKE GERMANY)', hsn: '84669390', qty: 1, unit: '-', unitPrice: 15500 },
      { id: 5, name: 'TAPER GRINDING', hsn: '998717', qty: 1, unit: '-', unitPrice: 5500 },
      { id: 6, name: 'SHAFT BALANCING G2.5', hsn: '84669390', qty: 1, unit: '-', unitPrice: 2500 },
      { id: 7, name: 'REMOVAL & FITMENT CHARGES', hsn: '998717', qty: 1, unit: '-', unitPrice: 12500 }
    ]
  });

  // Load Proforma Invoices & Approved Quotations
  const loadPIs = async (preferredId = null) => {
    setIsLoading(true);
    setError(null);

    // 1. Fetch proformas
    const res = await proformaInvoiceService.getProformaInvoices();
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    }
    const data = res.data || [];
    setProformaInvoices(data);

    setSelectedPI(prev => {
      const targetId = preferredId || (prev ? (prev.piNumber || prev.id) : null);
      if (targetId) {
        const match = data.find(p => p.id === targetId || p.piNumber === targetId || p.dbId === targetId);
        if (match) return match;
      }
      return data[0] || null;
    });

    // 2. Fetch approved quotations for conversion dropdown
    try {
      const qRes = await salesService.getQuotations();
      if (qRes && qRes.data) {
        const approved = qRes.data.filter(q => q.status?.toLowerCase() === 'approved');
        setApprovedQuotations(approved);
      }
    } catch (_err) {}

    setIsLoading(false);
  };

  useEffect(() => {
    loadPIs();
  }, []);

  // Form Live Calculations
  const formCalculations = useMemo(() => {
    const subtotal = formState.items.reduce((s, it) => s + ((Number(it.qty) || 0) * (Number(it.unitPrice || it.rate) || 0)), 0);
    const isInterState = formState.placeOfSupply && !formState.placeOfSupply.startsWith('27');
    const taxTotal = Math.round(subtotal * 0.18);
    const cgst = isInterState ? 0 : Math.round(taxTotal / 2);
    const sgst = isInterState ? 0 : Math.round(taxTotal / 2);
    const igst = isInterState ? taxTotal : 0;
    const grandTotal = subtotal + taxTotal;
    const totalQty = formState.items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    const amountInWords = numberToIndianWords(grandTotal);

    return { subtotal, taxTotal, cgst, sgst, igst, grandTotal, totalQty, amountInWords, isInterState };
  }, [formState.items, formState.placeOfSupply]);

  // Calculate Dashboard KPI Metrics: Total, Ready to Send, Sent, Total Value
  const metrics = useMemo(() => {
    const totalCount = proformaInvoices.length;
    const readyPI = proformaInvoices.filter(p => !p.status?.toLowerCase().includes('sent')).length;
    const sentPI = proformaInvoices.filter(p => p.status?.toLowerCase() === 'sent').length;
    const totalValue = proformaInvoices.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    return { totalCount, readyPI, sentPI, totalValue };
  }, [proformaInvoices]);

  // Filtered list for left column: 'all', 'ready', 'sent'
  const filteredPIs = useMemo(() => {
    return proformaInvoices.filter((pi) => {
      const status = pi.status?.toLowerCase() || 'ready to send';
      const filter = statusFilter.toLowerCase();
      
      let matchesStatus = false;
      if (filter === 'all') {
        matchesStatus = true;
      } else if (filter === 'ready') {
        matchesStatus = !status.includes('sent');
      } else if (filter === 'sent') {
        matchesStatus = status === 'sent';
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (pi.piNumber && pi.piNumber.toLowerCase().includes(q)) ||
        (pi.id && String(pi.id).toLowerCase().includes(q)) ||
        (pi.customer && pi.customer.toLowerCase().includes(q)) ||
        (pi.spindleSerial && pi.spindleSerial.toLowerCase().includes(q)) ||
        (pi.salesOrder && pi.salesOrder.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [proformaInvoices, searchQuery, statusFilter]);

  // Open Create Modal & reset form
  const handleOpenCreateModal = () => {
    setEditingPIId(null);
    const nextNum = String(proformaInvoices.length + 27);
    setSelectedQuoteId('');
    setFormState({
      piNumber: nextNum,
      customer: 'T T B TOOLING',
      customerEmail: 'purchase@ttbtooling.com',
      customerContact: '9975108709',
      billingAddress: 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan\nPune, Maharashtra-410501\nIndia',
      gstin: '27AAKFT2876K1ZI',
      placeOfSupply: '27-Maharashtra',
      salesOrder: `SO-2026-0${nextNum}`,
      piDate: new Date().toISOString().split('T')[0].split('-').reverse().join('-'),
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0].split('-').reverse().join('-'),
      spindleSerial: 'HMMXXVI (M77-002)',
      challanNo: '049',
      challanDate: '18-08-2026',
      scopeOfWork: `1. DISMENTAL\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. DRAWBAR HARDCHROME\n6. DRAWBAR RECONDITIONING\n7. DISC SPRING REPLACEMENT\n8. TAPER GRINDING\n9. SHAFT BALANCING\n10. DYNAMIC RUN TEST`,
      paymentTerms: '50% Advance with Proforma, 50% against Dispatch Inspection',
      terms: 'Thanks for doing business with us!',
      quotationId: null,
      items: [
        { id: 1, name: 'RECONDITIONING CHARGES FOR SPINDLE (M77-002)', hsn: '84669390', qty: 1, unit: '-', unitPrice: 33500 },
        { id: 2, name: '7014CTYNSULP4 NSK (SET OF 4 )', hsn: '84821012', qty: 1, unit: 'SET', unitPrice: 22500 },
        { id: 3, name: 'TRANSPORT CHARGES', hsn: '996511', qty: 1, unit: '-', unitPrice: 3500 },
        { id: 4, name: 'DRAWBAR ASSEMBLY WITH DISC SPRING (MUBEA MAKE GERMANY)', hsn: '84669390', qty: 1, unit: '-', unitPrice: 15500 },
        { id: 5, name: 'TAPER GRINDING', hsn: '998717', qty: 1, unit: '-', unitPrice: 5500 },
        { id: 6, name: 'SHAFT BALANCING G2.5', hsn: '84669390', qty: 1, unit: '-', unitPrice: 2500 },
        { id: 7, name: 'REMOVAL & FITMENT CHARGES', hsn: '998717', qty: 1, unit: '-', unitPrice: 12500 }
      ]
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal to modify proforma details
  const handleOpenEdit = (pi) => {
    setEditingPIId(pi.dbId || pi.id);
    setSelectedQuoteId('');
    setFormState({
      piNumber: pi.piNumber || pi.id,
      customer: pi.customer || '',
      customerEmail: pi.customerEmail || '',
      customerContact: pi.contactNo || pi.customerContact || '',
      billingAddress: pi.billingAddress || pi.customerAddress || '',
      gstin: pi.gstin || '',
      placeOfSupply: pi.placeOfSupply || '27-Maharashtra',
      salesOrder: pi.salesOrder || '',
      piDate: pi.date || pi.issueDate || '',
      validUntil: pi.validUntil || '',
      spindleSerial: pi.spindleSerial || '',
      challanNo: pi.challanNo || '',
      challanDate: pi.challanDate || '',
      scopeOfWork: typeof pi.scopeOfWork === 'string' ? pi.scopeOfWork : (Array.isArray(pi.scopeOfWork) ? pi.scopeOfWork.join('\n') : ''),
      paymentTerms: pi.paymentTerms || '50% Advance with Proforma, 50% against Dispatch Inspection',
      terms: pi.terms || 'Thanks for doing business with us!',
      quotationId: pi.quotationId || null,
      items: (pi.items && pi.items.length > 0) ? pi.items.map((it, idx) => ({
        id: it.id || Date.now() + idx,
        name: it.name || it.product || it.desc || '',
        hsn: it.hsn || '',
        qty: Number(it.qty) || 1,
        unit: it.unit || '-',
        unitPrice: Number(it.unitPrice || it.rate) || 0
      })) : [
        { id: 1, name: 'Spindle Inspection & Reconditioning', hsn: '84669390', qty: 1, unit: '-', unitPrice: 35000 }
      ]
    });
    setIsCreateModalOpen(true);
  };

  // Convert / Auto-populate from Approved Quotation
  const handleSelectApprovedQuotation = (quoteId) => {
    setSelectedQuoteId(quoteId);
    if (!quoteId) return;

    const matchedQuote = approvedQuotations.find(q => q.id === quoteId || q.dbId === quoteId);
    if (!matchedQuote) return;

    const nextNum = String(proformaInvoices.length + 27);
    const newItems = (matchedQuote.items || []).map((it, idx) => ({
      id: Date.now() + idx,
      name: it.name || it.product || it.desc || 'Spindle Service Item',
      hsn: it.hsn || '',
      qty: Number(it.qty) || 1,
      unit: it.unit || '-',
      unitPrice: Number(it.unitPrice || it.rate) || 0
    }));

    setFormState(prev => ({
      ...prev,
      piNumber: prev.piNumber || nextNum,
      customer: matchedQuote.customer || prev.customer,
      customerEmail: matchedQuote.customerEmail || prev.customerEmail,
      customerContact: matchedQuote.contactNo || matchedQuote.contactPerson || prev.customerContact,
      billingAddress: matchedQuote.customerAddress || prev.billingAddress,
      gstin: matchedQuote.gstin || prev.gstin,
      placeOfSupply: matchedQuote.placeOfSupply || matchedQuote.state || '27-Maharashtra',
      salesOrder: `SO-2026-0${nextNum}`,
      spindleSerial: matchedQuote.spindleSerial || prev.spindleSerial,
      scopeOfWork: matchedQuote.scopeOfWork || prev.scopeOfWork,
      quotationId: matchedQuote.id || matchedQuote.dbId,
      items: newItems.length > 0 ? newItems : prev.items
    }));

    if (onNotify) onNotify(`Auto-populated details from Approved Quotation ${matchedQuote.id}`);
  };

  // Customer preset selection
  const handleCustomerSelect = (customerName) => {
    const matched = PRESET_CUSTOMERS.find(c => c.name === customerName);
    if (matched) {
      setFormState(prev => ({
        ...prev,
        customer: matched.name,
        customerEmail: matched.email,
        customerContact: matched.contact,
        billingAddress: matched.billingAddress,
        gstin: matched.gstin,
        placeOfSupply: matched.state,
        salesOrder: matched.defaultSO
      }));
    } else {
      setFormState(prev => ({ ...prev, customer: customerName }));
    }
  };

  // Line item manipulation
  const handleAddItem = () => {
    setFormState(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), name: '', hsn: '84669390', qty: 1, unit: '-', unitPrice: 0 }
      ]
    }));
  };

  const handleRemoveItem = (id) => {
    if (formState.items.length <= 1) {
      if (onNotify) onNotify('A Proforma Invoice must have at least one line item', 'warning');
      return;
    }
    setFormState(prev => ({
      ...prev,
      items: prev.items.filter(it => it.id !== id)
    }));
  };

  const handleItemChange = (id, field, val) => {
    setFormState(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === id ? { ...it, [field]: val } : it)
    }));
  };

  // Save Proforma Invoice:
  // - targetStatus: 'Ready to Send' or 'Sent' (if previously sent)
  // - openEmailImmediately: Saves then triggers email transmission
  const handleSavePI = async (openEmailImmediately = false) => {
    if (!formState.customer.trim()) {
      if (onNotify) onNotify('Please enter a customer name', 'danger');
      return;
    }

    const currentDoc = editingPIId ? proformaInvoices.find(p => p.dbId === editingPIId || p.id === editingPIId) : null;
    const targetStatus = (currentDoc && currentDoc.status === 'Sent' && !openEmailImmediately) ? 'Sent' : 'Ready to Send';

    const piNum = formState.piNumber || String(proformaInvoices.length + 27);
    const piPayload = {
      piNumber: piNum,
      customerName: formState.customer,
      customerEmail: formState.customerEmail,
      contactNo: formState.customerContact,
      customerAddress: formState.billingAddress,
      customerGstin: formState.gstin,
      placeOfSupply: formState.placeOfSupply,
      spindleSerial: formState.spindleSerial,
      challanNo: formState.challanNo,
      challanDate: formState.challanDate,
      scopeOfWork: formState.scopeOfWork,
      quotationId: formState.quotationId,
      salesOrderNo: formState.salesOrder,
      issueDate: formState.piDate,
      validUntil: formState.validUntil,
      paymentTerms: formState.paymentTerms,
      terms: formState.terms,
      subtotal: formCalculations.subtotal,
      discount: 0,
      totalAmount: formCalculations.grandTotal,
      status: targetStatus,
      items: formState.items
    };

    let res;
    if (editingPIId) {
      res = await proformaInvoiceService.updateProformaInvoice(editingPIId, piPayload);
    } else {
      res = await proformaInvoiceService.createProformaInvoice(piPayload);
    }

    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Failed to save Proforma Invoice in database.', 'error');
      return;
    }

    setIsCreateModalOpen(false);
    if (onNotify) onNotify(`Proforma Invoice ${piNum} saved successfully.`);
    await loadPIs(piNum);

    if (openEmailImmediately) {
      const newlyCreated = {
        id: piNum,
        piNumber: piNum,
        customer: formState.customer,
        customerEmail: formState.customerEmail,
        customerAddress: formState.billingAddress,
        placeOfSupply: formState.placeOfSupply,
        spindleSerial: formState.spindleSerial,
        totalAmount: formCalculations.grandTotal,
        items: formState.items,
        status: targetStatus
      };
      setEmailDoc(newlyCreated);
      setIsEmailComposerOpen(true);
    }
  };

  // Status updates (Ready to Send, Sent)
  const handleUpdateStatus = async (piId, newStatus) => {
    const targetPI = proformaInvoices.find(p => p.id === piId || p.dbId === piId);
    if (!targetPI) return;

    const idToUpdate = targetPI.dbId || targetPI.id;
    const res = await proformaInvoiceService.updateProformaInvoiceStatus(idToUpdate, newStatus);
    if (res.error) {
      if (onNotify) onNotify(res.error.message || `Failed to update Proforma Invoice to ${newStatus}`, 'error');
      return;
    }

    setProformaInvoices(prev => prev.map(p => {
      if (p.id === targetPI.id || p.dbId === targetPI.dbId) {
        return { ...p, status: newStatus, rawStatus: newStatus };
      }
      return p;
    }));

    setSelectedPI(prev => {
      if (prev && (prev.id === targetPI.id || prev.dbId === targetPI.dbId)) {
        return { ...prev, status: newStatus, rawStatus: newStatus };
      }
      return prev;
    });

    if (onNotify) onNotify(`Proforma Invoice status updated to ${newStatus}`);
  };

  // Delete Proforma Invoice with confirmation
  const confirmDeletePI = (pi) => {
    setPiToDelete(pi);
  };

  const handleDeletePI = async () => {
    if (!piToDelete) return;
    setIsDeleting(true);
    const idToDelete = piToDelete.dbId || piToDelete.id;
    const res = await proformaInvoiceService.deleteProformaInvoice(idToDelete);
    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Failed to delete Proforma Invoice', 'error');
      setIsDeleting(false);
      setPiToDelete(null);
      return;
    }

    if (onNotify) onNotify(`Proforma Invoice ${piToDelete.piNumber || piToDelete.id} deleted successfully`);
    setPiToDelete(null);
    setIsDeleting(false);
    await loadPIs();
  };

  // Print & PDF exports
  const handlePrint = () => {
    try {
      window.print();
      if (onNotify) onNotify(`Print dialog opened for Proforma Invoice ${selectedPI?.piNumber || selectedPI?.id}`);
    } catch (err) {
      console.error('Failed to print PI:', err);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      if (selectedPI) {
        await exportProformaInvoicePdf(selectedPI);
        if (onNotify) onNotify(`Proforma Invoice ${selectedPI.piNumber || selectedPI.id} downloaded (PDF)`);
      }
    } catch (err) {
      console.error('Failed to download PI PDF:', err);
      if (onNotify) onNotify('Failed to download PI PDF', 'error');
    }
  };

  // Email Actions: Sending the email is the sole trigger to mark as Sent
  const handleOpenEmail = (pi) => {
    setEmailDoc(pi);
    setIsEmailComposerOpen(true);
  };

  const handleEmailSent = async () => {
    if (!emailDoc) return;
    const piId = emailDoc.dbId || emailDoc.id;
    
    // Automatically transition to 'Sent' upon successful email transmission
    await proformaInvoiceService.updateProformaInvoiceStatus(piId, 'Sent');

    setProformaInvoices(prev => prev.map(p => {
      if (p.id === emailDoc.id || p.dbId === emailDoc.dbId) {
        return { ...p, status: 'Sent', rawStatus: 'Sent' };
      }
      return p;
    }));

    setSelectedPI(prev => {
      if (prev && (prev.id === emailDoc.id || prev.dbId === emailDoc.dbId)) {
        return { ...prev, status: 'Sent', rawStatus: 'Sent' };
      }
      return prev;
    });

    if (onNotify) onNotify(`Proforma Invoice sent via email to ${emailDoc.customerEmail || emailDoc.customer}. Status updated to Sent.`);
  };

  // Convert Proforma Invoice directly to official Tax Invoice
  const handleConvertToTaxInvoice = async () => {
    if (!selectedPI) return;
    setIsConvertingToTaxInvoice(true);
    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const todayStr = `${dd}-${mm}-${yyyy}`;

      const dueD = new Date();
      dueD.setDate(dueD.getDate() + 15);
      const dueDD = String(dueD.getDate()).padStart(2, '0');
      const dueMM = String(dueD.getMonth() + 1).padStart(2, '0');
      const dueYYYY = dueD.getFullYear();
      const dueStr = `${dueDD}-${dueMM}-${dueYYYY}`;

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const newInvNumber = `INV2026-27/${randomSuffix}`;

      const items = (selectedPI.items || []).map((it, idx) => ({
        id: idx + 1,
        name: it.name || it.item_name || 'Spindle Service / Component',
        hsn: it.hsn || it.hsn_sac || '84669390',
        qty: Number(it.qty || it.quantity || 1),
        unitPrice: Number(it.unitPrice || it.rate || it.unit_price || 0)
      }));

      const subtotal = items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0);
      const isInterstate = (selectedPI.placeOfSupply || '').trim().startsWith('27') ? false : true;
      const gstAmount = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + gstAmount;

      const taxInvPayload = {
        invoiceNumber: newInvNumber,
        customerName: selectedPI.customer || selectedPI.customerFullName || 'Valued Customer',
        customerEmail: selectedPI.customerEmail || '',
        customerAddress: selectedPI.billingAddress || selectedPI.customerAddress || '',
        customerGstin: selectedPI.gstin || '',
        placeOfSupply: selectedPI.placeOfSupply || '27-Maharashtra',
        contactNo: selectedPI.customerContact || selectedPI.contactNo || '',
        spindleSerial: selectedPI.spindleSerial || '',
        poNumber: selectedPI.salesOrder || 'VERBAL',
        scopeOfWork: selectedPI.scopeOfWork || '',
        proformaInvoiceId: selectedPI.id || selectedPI.piNumber || selectedPI.dbId,
        quotationId: selectedPI.quotationId || null,
        invoiceDate: todayStr,
        dueDate: dueStr,
        paymentTerms: 'Due on Receipt / Net 15 Days',
        subtotal: subtotal,
        discount: 0,
        totalAmount: totalAmount,
        paidAmount: 0,
        status: 'Payment Pending',
        terms: `We declare that this invoice shows the actual price of the goods\ndescribed and that all particulars are true and correct.\nBank Details:\nICICI Bank Ltd(Nanded City Branch)\nA/c No : 349105000701\nIFSC Code: ICIC0003491\nMSME (UDYAM ADHAR) NO-MH26A0189736\nTYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING\nMAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,INTEGRATED,SPINDLE REPAIRING ,SPINDLE MANUFACTURING.`,
        notes: `Issued from Proforma Invoice ${selectedPI.piNumber || selectedPI.id}`,
        items: items
      };

      const res = await invoiceService.createInvoice(taxInvPayload);
      if (res.error) {
        if (onNotify) onNotify(`Failed to create Tax Invoice: ${res.error.message || 'Database error'}`, 'error');
      } else {
        if (onNotify) onNotify(`Tax Invoice ${newInvNumber} issued successfully from Proforma Invoice ${selectedPI.piNumber || selectedPI.id}!`, 'success');
        if (onNavigate) {
          onNavigate('invoices');
        }
      }
    } catch (err) {
      console.error('Error converting PI to Tax Invoice:', err);
      if (onNotify) onNotify('Failed to convert Proforma Invoice to Tax Invoice', 'error');
    } finally {
      setIsConvertingToTaxInvoice(false);
    }
  };

  if (isLoading) {
    return <TablePageSkeleton hasMetrics={true} metricCount={4} columns={['100px', '160px', '120px', '90px', '90px', '90px', '80px', '70px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Proforma Invoices" 
          subtitle="Commercial proforma invoices, advance payment milestones, and approved quotation conversion"
          badge="Database Notice"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
              {error.message || 'Unable to retrieve proforma invoices from PostgreSQL database.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => loadPIs()}>
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
      {/* Page Header */}
      <PageHeader 
        title="Proforma Invoices" 
        subtitle="Commercial proforma invoices, advance payment milestones, and approved quotation conversion"
        badge={`${proformaInvoices.length} Proforma Invoices`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => {
            try {
              exportProformaInvoiceRegisterPdf(proformaInvoices);
              if (onNotify) onNotify('Proforma Invoice Register downloaded (PDF)');
            } catch (err) {
              console.error('Failed to export PI register PDF:', err);
              if (onNotify) onNotify('Failed to export PI register PDF', 'error');
            }
          }}
        >
          <Download size={14} />
          <span>Export PIs</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleOpenCreateModal}
        >
          <Plus size={14} />
          <span>+ Create Proforma Invoice</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* Top KPI Metric Cards: Total Invoices, Ready to Send, Sent, Total Value */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Invoices</span>
              <div className="metric-icon-wrap"><FileText size={16} /></div>
            </div>
            <div className="metric-value">{metrics.totalCount}</div>
            <div className="metric-footer" style={{ color: 'var(--primary)' }}>Proforma registry</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Ready to Send</span>
              <div className="metric-icon-wrap"><Sparkles size={16} /></div>
            </div>
            <div className="metric-value">{metrics.readyPI}</div>
            <div className="metric-footer" style={{ color: '#d97706' }}>Awaiting email transmission</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Sent PI</span>
              <div className="metric-icon-wrap"><Send size={16} /></div>
            </div>
            <div className="metric-value">{metrics.sentPI}</div>
            <div className="metric-footer" style={{ color: '#0284c7' }}>Transmitted via email</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Value</span>
              <div className="metric-icon-wrap"><CheckCircle2 size={16} /></div>
            </div>
            <div className="metric-value">₹{metrics.totalValue.toLocaleString('en-IN')}</div>
            <div className="metric-footer" style={{ color: '#7A1F3D' }}>Total pipeline billing</div>
          </div>
        </div>

        {/* Master-Detail Split Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isDocExpanded ? '1fr' : '360px 1fr', 
          gap: '16px', 
          alignItems: 'start'
        }}>
          {/* Left Column: Compact Proforma Invoice List */}
          {!isDocExpanded && (
            <div className="section-card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Search & Filter Bar: All, Ready, Sent */}
              <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="search-input-wrap">
                  <Search size={14} className="search-icon" />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search PI #, Customer, Serial..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <CustomSelect 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: '100%', fontSize: '11.5px', height: '30px' }}
                    options={[
                      { value: 'all', label: `All Statuses (${proformaInvoices.length})` },
                      { value: 'ready', label: `Ready to Send (${metrics.readyPI})` },
                      { value: 'sent', label: `Sent / Emailed (${metrics.sentPI})` }
                    ]}
                  />
                </div>
              </div>

              {/* PI Cards List */}
              <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
                {filteredPIs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No proforma invoices found matching your criteria.
                  </div>
                ) : (
                  filteredPIs.map((pi) => {
                    const isSelected = selectedPI && (selectedPI.id === pi.id || selectedPI.piNumber === pi.piNumber || selectedPI.dbId === pi.dbId);
                    return (
                      <div 
                        key={pi.id || pi.dbId}
                        onClick={() => setSelectedPI(pi)}
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
                            {pi.piNumber ? `PI No. ${pi.piNumber}` : pi.id}
                          </span>
                          <StatusBadge status={pi.status} size="sm" />
                        </div>

                        <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pi.customer}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          <span>{pi.placeOfSupply || '27-Maharashtra'}</span>
                          <span className="mono">{pi.date || pi.issueDate || '22-08-2026'}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #f1f5f9' }}>
                          <span className="mono" style={{ fontWeight: 700, color: '#7A1F3D', fontSize: '12.5px' }}>
                            {pi.formattedTotal || `₹${Number(pi.totalAmount || 0).toLocaleString('en-IN')}`}
                          </span>

                          <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                              onClick={() => setSelectedPI(pi)}
                              title="View Document"
                            >
                              <Eye size={10} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                              onClick={() => handleOpenEdit(pi)}
                              title="Edit Proforma"
                            >
                              <Edit3 size={10} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                              onClick={() => handleOpenEmail(pi)}
                              title="Send Email"
                            >
                              <Mail size={10} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '22px', fontSize: '10px', padding: '0 6px', color: '#dc2626' }}
                              onClick={() => confirmDeletePI(pi)}
                              title="Delete Proforma Invoice"
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

          {/* Right Column: Authentic PDF Proforma Invoice Document View */}
          {selectedPI && (() => {
            const calculatedSubtotal = Number(selectedPI.subtotal) || (selectedPI.items || []).reduce(
              (sum, it) => sum + (Number(it.total != null ? it.total : (Number(it.qty || 0) * Number(it.unitPrice || it.rate || 0))) || 0),
              0
            ) || 95500;

            const isInterState = selectedPI.placeOfSupply && !selectedPI.placeOfSupply.startsWith('27');
            const calculatedTax = Math.round(calculatedSubtotal * 0.18);
            const calculatedCgst = isInterState ? 0 : Math.round(calculatedTax / 2);
            const calculatedSgst = isInterState ? 0 : Math.round(calculatedTax / 2);
            const calculatedIgst = isInterState ? calculatedTax : 0;
            const calculatedTotal = calculatedSubtotal + calculatedTax;
            const totalQuantity = (selectedPI.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
            const receivedAmt = Number(selectedPI.receivedAmount || 0);
            const balanceAmt = Math.max(0, calculatedTotal - receivedAmt);

            const computeHsnBreakdown = (itemList) => {
              const map = {};
              (itemList || []).forEach(it => {
                const rawCode = it.hsn != null ? String(it.hsn).trim() : '';
                const key = rawCode === '' ? '__blank__' : rawCode;
                const amt = Number(it.total != null ? it.total : (Number(it.qty || 0) * Number(it.unitPrice || it.rate || 0))) || 0;
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

            const hsnBreakdown = (selectedPI.hsnSummary && selectedPI.hsnSummary.length > 0)
              ? selectedPI.hsnSummary
              : computeHsnBreakdown(selectedPI.items);

            return (
              <div className="section-card" style={{ padding: '0', overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                {/* Top Action Header with State Transitions, Edit, Send Email, Print, Download, Full Screen & Delete */}
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
                      {selectedPI.piNumber ? `PI No. ${selectedPI.piNumber}` : selectedPI.id}
                    </span>
                    <StatusBadge status={selectedPI.status} size="sm" />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {selectedPI.customer}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Edit Proforma */}
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEdit(selectedPI)}
                      title="Edit Proforma details, line items, and terms"
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                    >
                      <Edit3 size={12} />
                      <span>Edit</span>
                    </button>

                    {/* Send Email: Sole action to transition to 'Sent' */}
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenEmail(selectedPI)}
                      title="Send Proforma Invoice to customer via email"
                      style={{ height: '28px', fontSize: '11px', padding: '0 10px', gap: '5px' }}
                    >
                      <Mail size={12} />
                      <span>{selectedPI.status === 'Sent' ? 'Resend Email' : 'Send Email'}</span>
                    </button>

                    {/* Issue Tax Invoice: Seamless workflow chain into Invoices screen */}
                    <button 
                      type="button" 
                      className="btn btn-sm"
                      onClick={handleConvertToTaxInvoice}
                      disabled={isConvertingToTaxInvoice}
                      title="Issue official Tax Invoice from this approved Proforma Invoice"
                      style={{ 
                        height: '28px', 
                        fontSize: '11px', 
                        padding: '0 10px', 
                        gap: '5px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      {isConvertingToTaxInvoice ? (
                        <>
                          <Loader2 size={12} className="spin" />
                          <span>Issuing...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck size={12} />
                          <span>Issue Tax Invoice</span>
                        </>
                      )}
                    </button>

                    <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 2px' }} />

                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={handlePrint}
                      title="Print official Proforma Invoice"
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                    >
                      <Printer size={12} />
                      <span>Print PDF</span>
                    </button>

                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={handleDownloadPdf}
                      title="Download authentic Proforma Invoice PDF"
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                    >
                      <Download size={12} />
                      <span>Download PDF</span>
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
                      onClick={() => confirmDeletePI(selectedPI)}
                      title="Delete this Proforma Invoice"
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

                {/* Document Body — Authentic 1:1 A4 Page Preview matching Proforma Invoice_27_TTB.pdf */}
                <div style={{ 
                  background: '#525659', 
                  padding: '24px 16px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'flex-start', 
                  overflowY: 'auto', 
                  overflowX: 'auto', 
                  flex: 1, 
                  minHeight: '0' 
                }}>
                  <div 
                    id="printable-proforma" 
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
                    {/* 1. Document Title Banner: Proforma Invoice */}
                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#000000', marginBottom: '6px', letterSpacing: '0.02em', flexShrink: 0 }}>
                      Proforma Invoice
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
                              ☎+919764252188 /9764032929<br />
                              Email: process@gpsspindles.net<br />
                              GSTIN: 27AATFG1527D1ZF<br />
                              State: 27-Maharashtra
                            </div>
                          </div>
                        </div>

                        {/* Right: Metadata Grid (3 rows: Row 1 = Proforma Invoice No/Date, Row 2 = Place of supply/empty corner, Row 3 = empty bottom space) */}
                        <div style={{ borderLeft: '1px solid #b8b8b8', display: 'flex', flexDirection: 'column' }}>
                          {/* Row 1: Proforma Invoice No. & Date */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                            <div style={{ padding: '3.5px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Proforma Invoice No.</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedPI.piNumber || selectedPI.id || '27'}
                              </div>
                            </div>
                            <div style={{ padding: '3.5px 6px', borderLeft: '1px solid #b8b8b8' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Date</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedPI.date || selectedPI.issueDate || '22-08-2026'}
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Place of supply & empty right corner */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                            <div style={{ padding: '3.5px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Place of supply</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedPI.placeOfSupply || selectedPI.state || '27-Maharashtra'}
                              </div>
                            </div>
                            <div style={{ borderLeft: '1px solid #b8b8b8' }}></div>
                          </div>

                          {/* Row 3: Empty bottom column space */}
                          <div style={{ flex: 1, minHeight: '34px' }}></div>
                        </div>
                      </div>

                      {/* 3. Proforma Invoice For (Customer Box) */}
                      <div style={{ padding: '8px 12px 14px 12px', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                        <div style={{ fontSize: '7.8px', color: '#000000', marginBottom: '3px' }}>
                          Proforma Invoice For
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#000000', marginBottom: '4px' }}>
                          {selectedPI.customer || 'T T B TOOLING'}
                        </div>
                        <div style={{ fontSize: '8px', color: '#000000', lineHeight: '1.32', marginBottom: '16px' }}>
                          {selectedPI.customerAddress ? (
                            selectedPI.customerAddress.includes('\n') ? (
                              selectedPI.customerAddress.split('\n').map((l, i) => <div key={i}>{l}</div>)
                            ) : (
                              <div>{selectedPI.customerAddress}</div>
                            )
                          ) : (
                            <>
                              <div>PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan</div>
                              <div>Pune, Maharashtra-410501</div>
                              <div>India</div>
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: '8px', color: '#000000', marginBottom: '6px' }}>
                          Contact No. : {selectedPI.contactNo || selectedPI.customerContact || '9975108709'}
                        </div>
                        <div style={{ fontSize: '8px', color: '#000000', marginBottom: '6px' }}>
                          GSTIN : {selectedPI.gstin || '27AAKFT2876K1ZI'}
                        </div>
                        <div style={{ fontSize: '8px', color: '#000000' }}>
                          State: {selectedPI.state || selectedPI.placeOfSupply || '27-Maharashtra'}
                        </div>
                      </div>

                      {/* 4. Line Items Table with Unit column */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #b8b8b8', fontSize: '8px', color: '#000000', flexShrink: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 5px', width: '28px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>#</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>Item name</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '85px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>HSN/ SAC</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '60px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Quantity</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '50px', textAlign: 'center', fontWeight: 700, background: '#ffffff' }}>Unit</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '90px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Price/ Unit</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', padding: '3.5px 6px', width: '100px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedPI.items || []).map((item, idx) => {
                            const itemTotal = Number(item.total != null ? item.total : (Number(item.qty || 0) * Number(item.unitPrice || item.rate || 0))) || 0;
                            return (
                              <tr key={item.id || idx}>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 5px', textAlign: 'left' }}>
                                  {idx + 1}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', fontWeight: 700 }}>
                                  {item.name || item.product || item.desc}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'left' }}>
                                  {item.hsn || ''}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                                  {item.qty}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'center' }}>
                                  {item.unit || '-'}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                                  ₹ {Number(item.unitPrice || item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right', fontWeight: 700 }}>
                                  ₹ {itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Table Total Row directly follows items */}
                          <tr style={{ fontWeight: 700 }}>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 5px' }}></td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'left' }}>Total</td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px' }}></td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'right' }}>
                              {totalQuantity}
                            </td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px' }}></td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px' }}></td>
                            <td style={{ padding: '3.5px 6px', textAlign: 'right' }}>
                              ₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 5. Middle Section: Words, Description & Amounts */}
                      <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                        {/* Left: Words + Description */}
                        <div>
                          {/* Proforma Invoice Amount in Words */}
                          <div style={{ padding: '5px 8px', borderBottom: '1px solid #b8b8b8' }}>
                            <div style={{ fontSize: '7.5px', color: '#000000' }}>Proforma Invoice Amount in Words</div>
                            <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#000000', marginTop: '2px' }}>
                              INR {selectedPI.amountInWords || numberToIndianWords(calculatedTotal)}
                            </div>
                          </div>

                          {/* Description */}
                          <div style={{ padding: '6px 8px', fontSize: '7.8px', color: '#000000', lineHeight: '1.3' }}>
                            <div style={{ color: '#000000' }}>Description</div>
                            <div style={{ fontWeight: 700, marginTop: '2px' }}>
                              SERIAL NO. {selectedPI.spindleSerial || 'HMMXXVI (M77-002)'}
                            </div>
                            <div style={{ fontWeight: 700 }}>
                              CHALLAN NO. {selectedPI.challanNo || '049'}
                            </div>
                            <div style={{ fontWeight: 700 }}>
                              CHALLAN DATE. {selectedPI.challanDate || '18-08-2026'}
                            </div>
                            <div style={{ fontWeight: 700, marginTop: '2px' }}>
                              SCOPE OF WORK :
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px', fontSize: '7.4px', lineHeight: '1.5', fontWeight: 700 }}>
                              {(() => {
                                const rawScope = Array.isArray(selectedPI.scopeOfWork)
                                  ? selectedPI.scopeOfWork
                                  : (selectedPI.scopeOfWork || `1. DISMENTAL\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. DRAWBAR HARDCHROME\n6. DRAWBAR RECONDITIONING\n7. DISC SPRING REPLACEMENT\n8. TAPER GRINDING\n9. SHAFT BALANCING\n10. DYNAMIC RUN TEST`).split('\n');
                                return rawScope.map((line, idx) => (
                                  <div key={idx}>{line.trim()}</div>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amounts & Tax Breakdown matching Proforma Invoice_27_TTB.pdf */}
                        <div style={{ borderLeft: '1px solid #b8b8b8', padding: '6px 10px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: '8px', color: '#000000', marginBottom: '4px', fontWeight: 600 }}>Amounts</div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3.5px 0' }}>
                            <span>Sub Total</span>
                            <span>₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          {!isInterState ? (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3.5px 0' }}>
                                <span>CGST@9%</span>
                                <span>₹ {calculatedCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3.5px 0' }}>
                                <span>SGST@9%</span>
                                <span>₹ {calculatedSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3.5px 0' }}>
                              <span>IGST@18%</span>
                              <span>₹ {calculatedIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}

                          <div style={{ borderTop: '1px solid #b8b8b8', margin: '4px 0' }} />

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.8px', fontWeight: 700, padding: '3px 0' }}>
                            <span>Total</span>
                            <span>₹ {calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0', color: '#000000' }}>
                            <span>Received</span>
                            <span>₹ {receivedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', fontWeight: 700, padding: '3px 0', color: '#000000' }}>
                            <span>Balance</span>
                            <span>₹ {balanceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                            const cgstAmt = Math.round(row.taxable * 0.09);
                            const sgstAmt = Math.round(row.taxable * 0.09);
                            const igstAmt = Math.round(row.taxable * 0.18);
                            const totalTax = isInterState ? igstAmt : (cgstAmt + sgstAmt);
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

                      {/* 7. Bottom Section: Bank Details, Terms, and Signatory (3 Columns) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '29% 41% 30%', fontSize: '7.2px', color: '#000000', flex: 1, minHeight: 0 }}>
                        {/* Col 1: Bank Details */}
                        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontWeight: 700, fontSize: '8.5px', marginBottom: '6px' }}>Bank Details</div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <UpiQrCode 
                              amount={calculatedTotal}
                              quoteNo={selectedPI.proformaNo || selectedPI.piNumber || selectedPI.id}
                              upiId={selectedPI.bankDetails?.upiId || selectedPI.upiId || getActiveUpiId()}
                              payeeName={selectedPI.bankDetails?.accountName || 'GENERAL PRECISION SPINDLES'}
                              size={48}
                              onNotify={onNotify}
                            />

                            <div style={{ fontSize: '7.4px', lineHeight: '1.45' }}>
                              <div style={{ marginBottom: '4px' }}>Name : ICICI BANK LIMITED, PUNE<br />NANDED CITY</div>
                              <div style={{ marginBottom: '4px' }}>Account No. : 349105000701</div>
                              <div style={{ marginBottom: '4px' }}>IFSC code : ICIC0003491</div>
                              <div style={{ marginBottom: '4px' }}>
                                UPI ID : <span className="mono" style={{ color: '#7A1F3D', fontWeight: 600 }}>{selectedPI.bankDetails?.upiId || selectedPI.upiId || getActiveUpiId()}</span>
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
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* CREATE / EDIT PROFORMA INVOICE MODAL (With Approved Quotation Auto-Fill) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingPIId ? `Edit Proforma Invoice: ${formState.piNumber || editingPIId}` : "+ Create Proforma Invoice"}
        maxWidth="860px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Total: <strong className="mono" style={{ color: '#7A1F3D', fontSize: '14px' }}>₹{formCalculations.grandTotal.toLocaleString('en-IN')}</strong> (Incl. 18% GST)
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
                onClick={() => handleSavePI(false)}
                title="Save Proforma Invoice"
                style={{ fontWeight: 600 }}
              >
                <CheckCircle2 size={13} color="var(--primary)" />
                <span>Save Proforma Invoice</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleSavePI(true)}
                title="Save proforma and immediately open email composer"
              >
                <Mail size={13} />
                <span>Save & Send Email</span>
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSavePI(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Mode 1: Import from Approved Quotations (Available in creation mode) */}
          {!editingPIId && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700, fontSize: '12.5px' }}>
                  <FileCheck size={16} color="#16a34a" />
                  <span>Import from Approved Quotation (Automatic Auto-Fill)</span>
                </div>
                {selectedQuoteId && (
                  <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 600 }}>
                    Linked: {selectedQuoteId}
                  </span>
                )}
              </div>

              <select
                className="form-control"
                value={selectedQuoteId}
                onChange={(e) => handleSelectApprovedQuotation(e.target.value)}
                style={{ fontSize: '12px', background: '#ffffff' }}
              >
                <option value="">-- Select an approved quotation to auto-populate all fields, or create standalone below --</option>
                {approvedQuotations.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.id} - {q.customer} (₹{Number(q.totalAmount || 0).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
              {approvedQuotations.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px' }}>
                  💡 No approved quotations found in system right now. You can create a Proforma Invoice standalone directly below!
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px' }}>
                  Selecting an approved quotation instantly imports customer details, spindle specifications, scope of work, and line items.
                </div>
              )}
            </div>
          )}

          {/* Customer & Invoice Coordinates */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12.5px' }}>
              <Building2 size={15} />
              <span>Customer Information & Invoice Details</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Customer Name (Preset or Custom)</label>
                <input 
                  list="pi-customer-presets"
                  className="form-control"
                  value={formState.customer}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  placeholder="e.g. T T B TOOLING"
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
                  value={formState.customerEmail}
                  onChange={(e) => setFormState(prev => ({ ...prev, customerEmail: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Contact No.</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formState.customerContact}
                  onChange={(e) => setFormState(prev => ({ ...prev, customerContact: e.target.value }))}
                  placeholder="e.g. 9975108709"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Customer Address</label>
                <input 
                  type="text"
                  className="form-control"
                  value={formState.billingAddress}
                  onChange={(e) => setFormState(prev => ({ ...prev, billingAddress: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Customer GSTIN</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formState.gstin}
                  onChange={(e) => setFormState(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                  placeholder="27AAKFT2876K1ZI"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Place of Supply / State</label>
                <select 
                  className="form-control"
                  value={formState.placeOfSupply}
                  onChange={(e) => setFormState(prev => ({ ...prev, placeOfSupply: e.target.value }))}
                >
                  <option value="27-Maharashtra">27-Maharashtra (CGST 9% + SGST 9%)</option>
                  <option value="23-Madhya Pradesh">23-Madhya Pradesh (IGST 18%)</option>
                  <option value="24-Gujarat">24-Gujarat (IGST 18%)</option>
                  <option value="29-Karnataka">29-Karnataka (IGST 18%)</option>
                  <option value="33-Tamil Nadu">33-Tamil Nadu (IGST 18%)</option>
                  <option value="36-Telangana">36-Telangana (IGST 18%)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>PI Number</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formState.piNumber}
                  onChange={(e) => setFormState(prev => ({ ...prev, piNumber: e.target.value }))}
                  placeholder="27"
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>PI Date</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formState.piDate}
                  onChange={(e) => setFormState(prev => ({ ...prev, piDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Valid Until</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formState.validUntil}
                  onChange={(e) => setFormState(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Sales Order / PO Ref</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formState.salesOrder}
                  onChange={(e) => setFormState(prev => ({ ...prev, salesOrder: e.target.value }))}
                  placeholder="e.g. SO-2026-027"
                />
              </div>
            </div>
          </div>

          {/* Spindle Details & Scope of Work */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12.5px' }}>
              <ShieldCheck size={15} />
              <span>Spindle Specifications, Challan & Scope of Work</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Spindle Serial No.</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formState.spindleSerial}
                  onChange={(e) => setFormState(prev => ({ ...prev, spindleSerial: e.target.value }))}
                  placeholder="e.g. HMMXXVI (M77-002)"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Challan No.</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formState.challanNo}
                  onChange={(e) => setFormState(prev => ({ ...prev, challanNo: e.target.value }))}
                  placeholder="049"
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>Challan Date</label>
                <input 
                  type="text"
                  className="form-control mono"
                  value={formState.challanDate}
                  onChange={(e) => setFormState(prev => ({ ...prev, challanDate: e.target.value }))}
                  placeholder="18-08-2026"
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Scope of Work (Numbered List)</label>
              <textarea 
                className="form-control"
                rows={4}
                value={formState.scopeOfWork}
                onChange={(e) => setFormState(prev => ({ ...prev, scopeOfWork: e.target.value }))}
                style={{ fontSize: '11.5px', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#7A1F3D' }}>Line Items (7-Column Format)</span>
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
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item name</th>
                    <th style={{ padding: '6px 8px', width: '90px', textAlign: 'center' }}>HSN/ SAC</th>
                    <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '6px 8px', width: '100px', textAlign: 'right' }}>Price/ Unit (₹)</th>
                    <th style={{ padding: '6px 8px', width: '100px', textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ padding: '6px 8px', width: '35px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formState.items.map((it) => {
                    const lineVal = (Number(it.qty) || 0) * (Number(it.unitPrice || it.rate) || 0);
                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '28px', fontSize: '11.5px' }}
                            value={it.name} 
                            onChange={(e) => handleItemChange(it.id, 'name', e.target.value)}
                            placeholder="Item description"
                            required
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'center' }}
                            value={it.hsn} 
                            onChange={(e) => handleItemChange(it.id, 'hsn', e.target.value)}
                            placeholder="84669390"
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
                            type="text" 
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'center' }}
                            value={it.unit} 
                            onChange={(e) => handleItemChange(it.id, 'unit', e.target.value)}
                            placeholder="-"
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            min="0"
                            className="form-control mono" 
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'right' }}
                            value={it.unitPrice} 
                            onChange={(e) => handleItemChange(it.id, 'unitPrice', e.target.value)}
                          />
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
                  <span style={{ color: 'var(--text-muted)' }}>Sub Total:</span>
                  <span className="mono">₹{formCalculations.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {!formCalculations.isInterState ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>CGST@9%:</span>
                      <span className="mono">₹{formCalculations.cgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>SGST@9%:</span>
                      <span className="mono">₹{formCalculations.sgst.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IGST@18%:</span>
                    <span className="mono">₹{formCalculations.igst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 800, color: 'var(--primary)', fontSize: '13px' }}>
                  <span>Grand Total:</span>
                  <span className="mono">₹{formCalculations.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(piToDelete)}
        onClose={() => setPiToDelete(null)}
        title="Delete Proforma Invoice"
        maxWidth="450px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setPiToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-sm"
              onClick={handleDeletePI}
              disabled={isDeleting}
              style={{
                background: '#dc2626',
                borderColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '6px 0' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={20} color="#dc2626" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>
              Confirm Proforma Invoice Deletion
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
              Are you sure you want to delete Proforma Invoice <strong className="mono" style={{ color: '#000000' }}>{piToDelete?.piNumber || piToDelete?.id}</strong> for <strong>{piToDelete?.customer}</strong>?
            </p>
            <p style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '8px', marginBottom: 0, fontWeight: 500 }}>
              ⚠️ This will remove the proforma record and all associated line items.
            </p>
          </div>
        </div>
      </Modal>

      {/* OUTLOOK EMAIL COMPOSER (Transmitting email updates status to 'Sent') */}
      {isEmailComposerOpen && emailDoc && (
        <OutlookEmailComposer
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          documentData={emailDoc}
          documentType="invoice"
          onSent={handleEmailSent}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}
