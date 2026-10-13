import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { invoiceService, DEFAULT_PS_MAINTENANCE_INVOICE } from '../services/database/invoiceService';
import { proformaInvoiceService } from '../services/database/proformaInvoiceService';
import { salesService } from '../services/database/salesService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { 
  exportTaxInvoicePdf, 
  exportGstr1ReportPdf, 
  numberToIndianWords 
} from '../utils/pdfGenerator';
import UpiQrCode from '../components/common/UpiQrCode';
import { getActiveUpiId } from '../utils/upiQrGenerator';
import { 
  Search, FileText, Download, Printer, 
  CheckCircle2, Plus, AlertCircle, Mail, Eye, RefreshCw,
  Edit3, Trash2, Maximize2, Minimize2, Sparkles, FileCheck, 
  CreditCard, DollarSign, ZoomIn, ZoomOut, Building2, ShieldCheck, Phone
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';

const PRESET_CUSTOMERS = [
  {
    name: 'PS MAINTENANCE SERVICE',
    fullName: 'PS MAINTENANCE SERVICE',
    contact: '8600280084',
    email: 'service@psmaintenance.in',
    billingAddress: 'PLOT NO 64 FLAT NO 6 PURVA APARTMENT CDC SHAHU NAGAR CHINCHWAD\nPune, Maharashtra-411019\nIndia',
    gstin: '27AIBPB6756H1ZB',
    state: '27-Maharashtra',
    defaultSO: 'VERBAL'
  },
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

export default function InvoicesScreen({ onNotify, onNavigate }) {
  // Invoices & Selection
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [approvedQuotations, setApprovedQuotations] = useState([]);
  const [proformaInvoices, setProformaInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Zoom & Preview Container Ref
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

  useEffect(() => {
    handleFitWidth();
    window.addEventListener('resize', handleFitWidth);
    return () => window.removeEventListener('resize', handleFitWidth);
  }, [handleFitWidth, selectedInvoice]);

  // Filters & Layout
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDocExpanded, setIsDocExpanded] = useState(false);

  // Modals & Creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [selectedProformaId, setSelectedProformaId] = useState('');

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Email Composer
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [emailDoc, setEmailDoc] = useState(null);

  // Clean Tax Invoice Template (Empty values by default)
  const CLEAN_INVOICE_TEMPLATE = {
    invoiceNumber: '',
    customer: '',
    customerEmail: '',
    customerContact: '',
    billingAddress: '',
    gstin: '',
    placeOfSupply: '27-Maharashtra',
    poNumber: '',
    salesOrder: '',
    invoiceDate: new Date().toISOString().split('T')[0].split('-').reverse().join('-'),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0].split('-').reverse().join('-'),
    spindleSerial: '',
    scopeOfWork: '',
    paymentTerms: 'Due on Receipt / Net 15 Days',
    terms: `We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nBank Details:\nICICI Bank Ltd(Nanded City Branch)\nA/c No : 349105000701\nIFSC Code: ICIC0003491\nMSME (UDYAM ADHAR) NO-MH26A0189736\nTYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING\nMAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,INTEGRATED,SPINDLE REPAIRING ,SPINDLE MANUFACTURING.`,
    quotationId: null,
    proformaInvoiceId: null,
    paidAmount: 0,
    items: [
      { id: 1, name: '', hsn: '84669390', qty: 1, unitPrice: 0 }
    ]
  };

  // Form State for Create / Edit Tax Invoice
  const [formState, setFormState] = useState(CLEAN_INVOICE_TEMPLATE);

  // Load Invoices and Reference Lists
  const loadInvoices = async (preferredSelectId = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, qRes, piRes] = await Promise.all([
        invoiceService.getInvoices(),
        salesService.getQuotations(),
        proformaInvoiceService.getProformaInvoices()
      ]);

      if (invRes.error) {
        setError(invRes.error);
        setIsLoading(false);
        return;
      }

      const invData = invRes.data || [DEFAULT_PS_MAINTENANCE_INVOICE];
      setInvoices(invData);

      if (qRes && qRes.data) {
        const approved = qRes.data.filter(q => (q.status || '').toLowerCase() === 'approved');
        setApprovedQuotations(approved.length > 0 ? approved : qRes.data);
      }
      if (piRes && piRes.data) {
        setProformaInvoices(piRes.data);
      }

      const targetId = preferredSelectId || (typeof window !== 'undefined' ? window.__TARGET_TAX_INVOICE_ID__ : null);
      if (typeof window !== 'undefined' && window.__TARGET_TAX_INVOICE_ID__) {
        window.__TARGET_TAX_INVOICE_ID__ = null;
      }

      if (targetId) {
        const found = invData.find(i => i.id === targetId || i.dbId === targetId || i.invoiceNumber === targetId);
        if (found) setSelectedInvoice(found);
        else setSelectedInvoice(invData[0] || null);
      } else if (!selectedInvoice && invData.length > 0) {
        setSelectedInvoice(invData[0]);
      } else if (selectedInvoice) {
        const updated = invData.find(i => i.id === selectedInvoice.id || i.dbId === selectedInvoice.dbId);
        if (updated) setSelectedInvoice(updated);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError({ message: err.message || 'Error loading invoices' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Form Live Calculations
  const formCalculations = useMemo(() => {
    const subtotal = formState.items.reduce((sum, item) => {
      const q = Number(item.qty) || 0;
      const r = Number(item.unitPrice || item.rate) || 0;
      return sum + (q * r);
    }, 0);

    const isInterState = !String(formState.placeOfSupply || '27-Maharashtra').startsWith('27');
    const taxTotal = Math.round(subtotal * 0.18);
    const cgst = isInterState ? 0 : Math.round(taxTotal / 2);
    const sgst = isInterState ? 0 : Math.round(taxTotal / 2);
    const igst = isInterState ? taxTotal : 0;
    const grandTotal = subtotal + taxTotal;
    const paid = Number(formState.paidAmount) || 0;
    const balance = Math.max(0, grandTotal - paid);
    const totalQty = formState.items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    const amountInWords = numberToIndianWords(grandTotal);

    return { subtotal, taxTotal, cgst, sgst, igst, grandTotal, paid, balance, totalQty, amountInWords, isInterState };
  }, [formState.items, formState.placeOfSupply, formState.paidAmount]);

  // Dashboard Tax & Billing KPI Metrics: Total, Taxable Turnover, GST Output, Gross Invoiced Value
  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const totalSubtotal = invoices.reduce((sum, i) => {
      const itSub = (i.items || []).reduce((s, it) => {
        const q = Number(it.qty != null ? it.qty : (it.quantity || 1));
        const r = Number(it.unitPrice != null ? it.unitPrice : (it.rate || it.price || 0));
        return s + (q * r);
      }, 0);
      return sum + (itSub > 0 ? itSub : (Number(i.subtotal) || 0));
    }, 0);
    const totalTax = invoices.reduce((sum, i) => sum + (Number(i.gstAmount || i.taxAmount) || Math.round((Number(i.subtotal) || 0) * 0.18)), 0);
    const totalValue = invoices.reduce((sum, i) => sum + (Number(i.totalAmount || i.amountNum) || 0), 0);

    return { totalCount, totalSubtotal, totalTax, totalValue };
  }, [invoices]);

  // Filtered Invoices List
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isInter = !String(inv.placeOfSupply || inv.state || '27-Maharashtra').startsWith('27');
      const filter = statusFilter.toLowerCase();
      
      let matchesSupply = true;
      if (filter === 'intra') {
        matchesSupply = !isInter;
      } else if (filter === 'inter') {
        matchesSupply = isInter;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.id && String(inv.id).toLowerCase().includes(q)) ||
        (inv.customer && inv.customer.toLowerCase().includes(q)) ||
        (inv.spindleSerial && inv.spindleSerial.toLowerCase().includes(q)) ||
        (inv.poNumber && inv.poNumber.toLowerCase().includes(q)) ||
        (inv.refOrder && inv.refOrder.toLowerCase().includes(q));

      return matchesSupply && matchesSearch;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Open Create Modal & reset form
  const handleOpenCreateModal = () => {
    setEditingInvoiceId(null);
    const nextNum = `INV2026-27/${265 + invoices.length}`;
    setSelectedQuoteId('');
    setSelectedProformaId('');
    setFormState({
      ...CLEAN_INVOICE_TEMPLATE,
      invoiceNumber: nextNum,
      invoiceDate: new Date().toISOString().split('T')[0].split('-').reverse().join('-'),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0].split('-').reverse().join('-'),
      items: [
        { id: 1, name: '', hsn: '84669390', qty: 1, unitPrice: 0 }
      ]
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (inv) => {
    setEditingInvoiceId(inv.dbId || inv.id);
    setSelectedQuoteId('');
    setSelectedProformaId('');
    setFormState({
      invoiceNumber: inv.invoiceNumber || inv.id,
      customer: inv.customer || '',
      customerEmail: inv.customerEmail || '',
      customerContact: inv.contactNo || inv.customerContact || '',
      billingAddress: inv.billingAddress || inv.customerAddress || '',
      gstin: inv.gstin || inv.customerGstin || '',
      placeOfSupply: inv.placeOfSupply || '27-Maharashtra',
      poNumber: inv.poNumber || inv.purchaseOrderNo || 'VERBAL',
      salesOrder: inv.salesOrder || '',
      invoiceDate: inv.date || inv.invoiceDate || '',
      dueDate: inv.dueDate || '',
      spindleSerial: inv.spindleSerial || '',
      scopeOfWork: inv.scopeOfWork || '',
      paymentTerms: inv.paymentTerms || 'Due on Receipt / Net 15 Days',
      terms: inv.terms || '',
      quotationId: inv.quotationId || null,
      proformaInvoiceId: inv.proformaInvoiceId || null,
      paidAmount: Number(inv.paidAmountNum || inv.receivedAmount || 0),
      items: (inv.items && inv.items.length > 0) ? inv.items.map((it, idx) => ({
        id: it.id || idx + 1,
        name: it.name || it.product || it.desc || '',
        hsn: it.hsn || it.hsn_sac || '84669390',
        qty: Number(it.qty != null ? it.qty : (it.quantity || 1)),
        unitPrice: Number(it.unitPrice != null ? it.unitPrice : (it.rate || it.price || 0))
      })) : [
        { id: 1, name: 'Precision Spindle Service', hsn: '84669390', qty: 1, unitPrice: 50000 }
      ]
    });
    setIsCreateModalOpen(true);
  };

  // Import from Proforma Invoice (Chain: PI -> Tax Invoice)
  const handleImportProforma = (proformaId) => {
    setSelectedProformaId(proformaId);
    if (!proformaId) return;

    const pi = proformaInvoices.find(p => p.id === proformaId || p.dbId === proformaId || p.piNumber === proformaId);
    if (!pi) return;

    setFormState(prev => ({
      ...prev,
      proformaInvoiceId: pi.dbId || pi.id,
      customer: pi.customer || prev.customer,
      customerEmail: pi.customerEmail || prev.customerEmail,
      customerContact: pi.customerContact || pi.contactNo || prev.customerContact,
      billingAddress: pi.billingAddress || pi.customerAddress || prev.billingAddress,
      gstin: pi.gstin || prev.gstin,
      placeOfSupply: pi.placeOfSupply || prev.placeOfSupply,
      poNumber: pi.salesOrder || prev.poNumber,
      salesOrder: pi.salesOrder || prev.salesOrder,
      spindleSerial: pi.spindleSerial || prev.spindleSerial,
      scopeOfWork: pi.scopeOfWork || prev.scopeOfWork,
      paidAmount: Number(pi.receivedAmount || 0),
      items: (pi.items && pi.items.length > 0) ? pi.items.map((it, idx) => ({
        id: idx + 1,
        name: it.name || it.product || it.desc || 'Component',
        hsn: it.hsn || it.hsn_sac || '84669390',
        qty: Number(it.qty != null ? it.qty : 1),
        unitPrice: Number(it.unitPrice != null ? it.unitPrice : (it.rate || 0))
      })) : prev.items
    }));

    if (onNotify) {
      onNotify(`Auto-filled details & items from Proforma Invoice ${pi.piNumber || pi.id}`);
    }
  };

  // Import from Approved Quotation (Chain: Quote -> Tax Invoice)
  const handleImportQuotation = (quoteId) => {
    setSelectedQuoteId(quoteId);
    if (!quoteId) return;

    const quote = approvedQuotations.find(q => q.id === quoteId || q.quoteNumber === quoteId || q.dbId === quoteId);
    if (!quote) return;

    setFormState(prev => ({
      ...prev,
      quotationId: quote.dbId || quote.id,
      customer: quote.customer || prev.customer,
      customerEmail: quote.customerEmail || prev.customerEmail,
      customerContact: quote.customerPhone || quote.contactNo || prev.customerContact,
      billingAddress: quote.customerAddress || prev.billingAddress,
      gstin: quote.customerGstin || prev.gstin,
      placeOfSupply: quote.placeOfSupply || prev.placeOfSupply,
      poNumber: quote.poNumber || quote.purchaseOrderNo || prev.poNumber,
      salesOrder: quote.salesOrder || quote.quoteNumber || prev.salesOrder,
      spindleSerial: quote.spindleSerial || prev.spindleSerial,
      scopeOfWork: quote.scopeOfWork || prev.scopeOfWork,
      items: (quote.items && quote.items.length > 0) ? quote.items.map((it, idx) => ({
        id: idx + 1,
        name: it.name || it.product || it.desc || 'Component',
        hsn: it.hsn || it.hsn_sac || '84669390',
        qty: Number(it.qty != null ? it.qty : 1),
        unitPrice: Number(it.unitPrice != null ? it.unitPrice : (it.rate || 0))
      })) : prev.items
    }));

    if (onNotify) {
      onNotify(`Auto-filled details & items from Approved Quotation ${quote.quoteNumber || quote.id}`);
    }
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
        poNumber: matched.defaultSO || prev.poNumber
      }));
    } else {
      setFormState(prev => ({ ...prev, customer: customerName }));
    }
  };

  // Line Items Operations
  const handleAddItem = () => {
    setFormState(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), name: '', hsn: '84669390', qty: 1, unitPrice: 0 }
      ]
    }));
  };

  const handleRemoveItem = (id) => {
    if (formState.items.length === 1) {
      if (onNotify) onNotify('At least one line item is required.', 'warning');
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

  // Save Tax Invoice
  const handleSaveInvoice = async (openEmailImmediately = false) => {
    if (!formState.customer.trim()) {
      if (onNotify) onNotify('Please enter a customer name', 'danger');
      return;
    }

    const invNum = formState.invoiceNumber || `INV2026-27/${265 + invoices.length}`;
    const invPayload = {
      invoiceNumber: invNum,
      customerName: formState.customer,
      customerEmail: formState.customerEmail,
      contactNo: formState.customerContact,
      customerAddress: formState.billingAddress,
      customerGstin: formState.gstin,
      placeOfSupply: formState.placeOfSupply,
      poNumber: formState.poNumber || 'VERBAL',
      salesOrderNo: formState.salesOrder,
      spindleSerial: formState.spindleSerial,
      scopeOfWork: formState.scopeOfWork,
      quotationId: formState.quotationId,
      proformaInvoiceId: formState.proformaInvoiceId,
      invoiceDate: formState.invoiceDate,
      dueDate: formState.dueDate,
      paymentTerms: formState.paymentTerms,
      terms: formState.terms,
      subtotal: formCalculations.subtotal,
      discount: 0,
      totalAmount: formCalculations.grandTotal,
      paidAmount: formCalculations.paid,
      status: formCalculations.paid >= formCalculations.grandTotal ? 'Paid' : (formCalculations.paid > 0 ? 'Partially Paid' : 'Pending Payment'),
      items: formState.items
    };

    let res;
    if (editingInvoiceId) {
      res = await invoiceService.updateInvoice(editingInvoiceId, invPayload);
    } else {
      res = await invoiceService.createInvoice(invPayload);
    }

    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Failed to save Tax Invoice in database.', 'error');
      return;
    }

    setIsCreateModalOpen(false);
    if (onNotify) onNotify(`Tax Invoice ${invNum} saved successfully.`);
    await loadInvoices(invNum);

    if (openEmailImmediately) {
      const newlyCreated = {
        id: invNum,
        invoiceNumber: invNum,
        customer: formState.customer,
        customerEmail: formState.customerEmail,
        customerAddress: formState.billingAddress,
        placeOfSupply: formState.placeOfSupply,
        spindleSerial: formState.spindleSerial,
        totalAmount: formCalculations.grandTotal,
        amountNum: formCalculations.grandTotal,
        paidAmountNum: formCalculations.paid,
        balanceNum: formCalculations.balance,
        items: formState.items,
        status: invPayload.status
      };
      setEmailDoc(newlyCreated);
      setIsEmailComposerOpen(true);
    }
  };

  // Delete Invoice
  const confirmDeleteInvoice = (inv) => {
    setInvoiceToDelete(inv);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    const idToDelete = invoiceToDelete.dbId || invoiceToDelete.id;
    const res = await invoiceService.deleteInvoice(idToDelete);

    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Failed to delete Tax Invoice', 'error');
      setIsDeleting(false);
      setInvoiceToDelete(null);
      return;
    }

    if (onNotify) onNotify(`Tax Invoice ${invoiceToDelete.invoiceNumber || invoiceToDelete.id} deleted successfully`);
    setInvoiceToDelete(null);
    setIsDeleting(false);
    await loadInvoices();
  };

  // Print & PDF exports
  const handlePrint = async () => {
    try {
      if (selectedInvoice) {
        await exportTaxInvoicePdf(selectedInvoice, 'print');
        if (onNotify) onNotify(`Opening Tax Invoice ${selectedInvoice.invoiceNumber || selectedInvoice.id} for printing`);
      }
    } catch (err) {
      console.error('Failed to print Tax Invoice:', err);
      if (onNotify) onNotify('Failed to print Tax Invoice', 'error');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      if (selectedInvoice) {
        await exportTaxInvoicePdf(selectedInvoice, 'download');
        if (onNotify) onNotify(`Tax Invoice ${selectedInvoice.invoiceNumber || selectedInvoice.id} downloaded (PDF)`);
      }
    } catch (err) {
      console.error('Failed to download Tax Invoice PDF:', err);
      if (onNotify) onNotify('Failed to download Tax Invoice PDF', 'error');
    }
  };

  // Email Actions
  const handleOpenEmail = (inv) => {
    setEmailDoc(inv);
    setIsEmailComposerOpen(true);
  };

  const handleEmailSent = () => {
    if (onNotify && emailDoc) {
      onNotify(`Tax Invoice ${emailDoc.invoiceNumber || emailDoc.id} sent via email to ${emailDoc.customerEmail || emailDoc.customer}.`);
    }
  };

  if (isLoading) {
    return <TablePageSkeleton hasMetrics={true} metricCount={4} columns={['100px', '160px', '120px', '90px', '90px', '90px', '80px', '70px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Tax Invoices & Billing" 
          subtitle="Commercial tax invoices, GST billing (HSN 8466), and sales order billing"
          badge="Database Notice"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
              {error.message || 'Unable to retrieve tax invoices from PostgreSQL database.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => loadInvoices()}>
              <RefreshCw size={14} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Selected Invoice Calculations for Right Panel Preview
  const selectedCalculations = (() => {
    if (!selectedInvoice) return null;
    const items = selectedInvoice.items && selectedInvoice.items.length > 0 
      ? selectedInvoice.items 
      : [{ id: 1, name: 'Precision Spindle Service', hsn: '84669390', qty: 1, unitPrice: 50000, total: 50000 }];
    
    const computedSubtotal = items.reduce((s, it) => {
      const q = Number(it.qty != null ? it.qty : (it.quantity || 1));
      const r = Number(it.unitPrice != null ? it.unitPrice : (it.rate || it.price || 0));
      return s + (q * r);
    }, 0);
    const subtotal = computedSubtotal > 0 ? computedSubtotal : (Number(selectedInvoice.subtotal) || 0);

    const isInterState = !String(selectedInvoice.placeOfSupply || '27-Maharashtra').startsWith('27');
    const taxTotal = Number(selectedInvoice.gstAmount) || Math.round(subtotal * 0.18);
    const cgst = isInterState ? 0 : Math.round(taxTotal / 2);
    const sgst = isInterState ? 0 : Math.round(taxTotal / 2);
    const igst = isInterState ? taxTotal : 0;
    const grandTotal = Number(selectedInvoice.totalAmount || selectedInvoice.amountNum) || (subtotal + taxTotal);
    const received = Number(selectedInvoice.paidAmountNum || selectedInvoice.receivedAmount || 0);
    const balance = Math.max(0, grandTotal - received);
    const totalQty = items.reduce((s, it) => s + (Number(it.qty != null ? it.qty : (it.quantity || 1)) || 0), 0);

    // Group items by HSN for GST Table
    const hsnGroups = {};
    items.forEach(it => {
      const hsn = it.hsn || it.hsn_sac || '84669390';
      const q = Number(it.qty != null ? it.qty : (it.quantity || 1));
      const r = Number(it.unitPrice != null ? it.unitPrice : (it.rate || it.price || 0));
      const amt = (q > 0 && r > 0) ? (q * r) : Number(it.total != null ? it.total : 0);
      if (!hsnGroups[hsn]) {
        hsnGroups[hsn] = { hsn, taxable: 0 };
      }
      hsnGroups[hsn].taxable += amt;
    });
    const hsnList = Object.values(hsnGroups);

    return { items, subtotal, isInterState, taxTotal, cgst, sgst, igst, grandTotal, received, balance, totalQty, hsnList };
  })();

  return (
    <div className="content-area">
      {/* Page Header */}
      <PageHeader 
        title="Tax Invoices & Billing" 
        subtitle="Commercial GST tax invoices (HSN 8466), sales order billing, and GSTR-1 outward registers"
        badge={`${invoices.length} Registered Invoices`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => {
            try {
              exportGstr1ReportPdf(invoices);
              if (onNotify) onNotify('GSTR-1 Outward Supplies Register downloaded (PDF)');
            } catch (err) {
              console.error(err);
              if (onNotify) onNotify('Failed to generate GSTR-1 register', 'error');
            }
          }}
          title="Export GSTR-1 Outward Supplies Register PDF"
        >
          <Download size={14} />
          <span>GSTR-1 Export (PDF)</span>
        </button>

        {onNavigate && (
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => onNavigate('payments')}
            title="Manage Client Payments, Overdue Aging & Automated Reminders"
          >
            <CreditCard size={14} />
            <span>Client Payments & Receivables</span>
          </button>
        )}

        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleOpenCreateModal}
        >
          <Plus size={14} />
          <span>+ Create Tax Invoice</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* Top KPI Metric Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Invoices</span>
              <div className="metric-icon-wrap"><FileText size={16} /></div>
            </div>
            <div className="metric-value">{metrics.totalCount}</div>
            <div className="metric-footer" style={{ color: 'var(--primary)' }}>Tax invoice registry</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Taxable Turnover</span>
              <div className="metric-icon-wrap" style={{ color: '#0284c7' }}><Building2 size={16} /></div>
            </div>
            <div className="metric-value">₹{metrics.totalSubtotal.toLocaleString('en-IN')}</div>
            <div className="metric-footer" style={{ color: '#0284c7' }}>Pre-tax goods & service value</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">GST Output (18%)</span>
              <div className="metric-icon-wrap" style={{ color: '#7c3aed' }}><DollarSign size={16} /></div>
            </div>
            <div className="metric-value">₹{metrics.totalTax.toLocaleString('en-IN')}</div>
            <div className="metric-footer" style={{ color: '#7c3aed' }}>CGST / SGST / IGST liability</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Commercial Billing</span>
              <div className="metric-icon-wrap"><DollarSign size={16} /></div>
            </div>
            <div className="metric-value">₹{metrics.totalValue.toLocaleString('en-IN')}</div>
            <div className="metric-footer" style={{ color: '#7A1F3D' }}>Total gross commercial billing</div>
          </div>
        </div>

        {/* Master-Detail Split Layout */}
        <div 
          className="doc-split-layout"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: isDocExpanded ? '1fr' : '360px 1fr', 
            gap: '16px', 
            alignItems: 'start'
          }}
        >
          {/* Left Column: Compact Invoice Cards List */}
          {!isDocExpanded && (
            <div className="section-card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Search & Filter Bar */}
              <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="search-input-wrap">
                  <Search size={14} className="search-icon" />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search Invoice #, Customer, Serial, PO..." 
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
                      { value: 'all', label: `All Tax Invoices (${invoices.length})` },
                      { value: 'intra', label: 'Intra-State (MH - CGST/SGST)' },
                      { value: 'inter', label: 'Inter-State (IGST)' }
                    ]}
                  />
                </div>
              </div>

              {/* Invoice Cards List */}
              <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
                {filteredInvoices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No tax invoices found matching your criteria.
                  </div>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isSelected = selectedInvoice && (selectedInvoice.id === inv.id || selectedInvoice.invoiceNumber === inv.invoiceNumber || selectedInvoice.dbId === inv.dbId);
                    return (
                      <div 
                        key={inv.id || inv.dbId}
                        onClick={() => setSelectedInvoice(inv)}
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
                            {inv.invoiceNumber || inv.id}
                          </span>
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                            Tax Invoice
                          </span>
                        </div>

                        <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inv.customer}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          <span>PO: {inv.poNumber || inv.purchaseOrderNo || 'VERBAL'}</span>
                          <span className="mono">{inv.date || inv.invoiceDate || '30-09-2026'}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #f1f5f9' }}>
                          <div>
                            <span className="mono" style={{ fontWeight: 700, color: '#7A1F3D', fontSize: '12.5px' }}>
                              {inv.amount || `₹${Number(inv.totalAmount || 0).toLocaleString('en-IN')}`}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                              onClick={() => setSelectedInvoice(inv)}
                              title="View Document"
                            >
                              <Eye size={10} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                              onClick={() => handleOpenEdit(inv)}
                              title="Edit Tax Invoice"
                            >
                              <Edit3 size={10} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                              onClick={() => handleOpenEmail(inv)}
                              title="Send Email"
                            >
                              <Mail size={10} />
                            </button>
                            {onNavigate && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ height: '22px', fontSize: '10px', padding: '0 6px', color: '#0284c7' }}
                                onClick={() => {
                                  if (typeof window !== 'undefined') {
                                    window.__TARGET_PAYMENT_INVOICE_ID__ = inv.dbId || inv.id || inv.invoiceNumber;
                                  }
                                  onNavigate('payments');
                                }}
                                title="Record payment or view receivables"
                              >
                                <CreditCard size={10} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '22px', fontSize: '10px', padding: '0 6px', color: '#dc2626' }}
                              onClick={() => confirmDeleteInvoice(inv)}
                              title="Delete Tax Invoice"
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

          {/* Right Column: High-Fidelity Tax Invoice Visual Document */}
          <div className="section-card" style={{ padding: '0', overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {selectedInvoice && selectedCalculations ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
                      {selectedInvoice.invoiceNumber || selectedInvoice.id}
                    </span>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#334155', fontWeight: 600, border: '1px solid #cbd5e1' }}>
                      Tax Invoice
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {selectedInvoice.customer}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Send Email */}
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenEmail(selectedInvoice)}
                      title="Send Tax Invoice to customer via email"
                      style={{ height: '28px', fontSize: '11px', padding: '0 10px', gap: '5px' }}
                    >
                      <Mail size={12} />
                      <span>Send Email</span>
                    </button>

                    {/* Download PDF */}
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={handleDownloadPdf}
                      title="Download authentic PDF replica"
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                    >
                      <Download size={12} />
                      <span>Download PDF</span>
                    </button>

                    {/* Print PDF */}
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={handlePrint}
                      title="Print official Tax Invoice"
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                    >
                      <Printer size={12} />
                      <span>Print</span>
                    </button>

                    {/* Record Payment Direct Link */}
                    {onNavigate && (
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.__TARGET_PAYMENT_INVOICE_ID__ = selectedInvoice.dbId || selectedInvoice.id || selectedInvoice.invoiceNumber;
                          }
                          onNavigate('payments');
                        }}
                        title="Record Payment or view ledger for this Tax Invoice"
                        style={{ height: '28px', fontSize: '11px', padding: '0 9px', gap: '4px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                      >
                        <CreditCard size={12} />
                        <span>Record Payment</span>
                      </button>
                    )}

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
                        title="Auto-fit invoice to screen width"
                        style={{ background: 'transparent', border: 'none', padding: '0 6px', cursor: 'pointer', height: '100%', fontSize: '10px', color: 'var(--primary)', fontWeight: 600, borderLeft: '1px solid var(--border-color)' }}
                      >
                        Fit
                      </button>
                    </div>

                    {/* Full Screen Toggle */}
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsDocExpanded(!isDocExpanded)}
                      title={isDocExpanded ? 'Collapse to split view' : 'Expand full screen'}
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                    >
                      {isDocExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                      <span>{isDocExpanded ? 'Split View' : 'Full Screen'}</span>
                    </button>

                    {/* Edit Tax Invoice */}
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEdit(selectedInvoice)}
                      title="Edit Tax Invoice details, line items, and terms"
                      style={{ height: '28px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                    >
                      <Edit3 size={12} />
                      <span>Edit</span>
                    </button>

                    {/* Delete Invoice */}
                    <button 
                      type="button" 
                      className="btn btn-sm"
                      onClick={() => confirmDeleteInvoice(selectedInvoice)}
                      title="Delete Tax Invoice"
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

                {/* Printable Document Paper Sheet Container with Standard A4 Dimensions */}
                <div 
                  ref={previewContainerRef}
                  style={{ 
                    padding: '16px 0', 
                    background: 'transparent', 
                    overflowY: 'auto',
                    overflowX: 'auto', 
                    flex: 1, 
                    minHeight: 0, 
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
                      id="printable-tax-invoice"
                    style={{
                      width: '794px',
                      minWidth: '794px',
                      maxWidth: '794px',
                      height: '1123px',
                      minHeight: '1123px',
                      maxHeight: '1123px',
                      margin: '0 auto',
                      background: '#ffffff',
                      boxShadow: 'none',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      color: '#000000',
                      padding: '24px 28px',
                      boxSizing: 'border-box',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Top Header: Centered "Tax Invoice" & Right "ORIGINAL FOR RECIPIENT" */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
                      <div style={{ width: '120px' }}></div>
                      <div style={{ fontSize: '16px', fontWeight: 800, textTransform: 'none', textAlign: 'center', flex: 1, letterSpacing: '0.2px' }}>
                        Tax Invoice
                      </div>
                      <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#4b5563', width: '140px', textAlign: 'right' }}>
                        ORIGINAL FOR RECIPIENT
                      </div>
                    </div>

                    {/* Main Outer Box with Crisp Borders */}
                    <div style={{
                      border: '1px solid #b8b8b8',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      minHeight: 0
                    }}>
                      
                      {/* 1. Company Header Grid (Left Company Details + Right Metadata 2x2) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', minHeight: '105px' }}>
                        
                        {/* Left: Company Details with Logo */}
                        <div style={{ padding: '8px 10px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <img 
                            src="/logo.jpg" 
                            alt="General Precision Spindles" 
                            style={{ width: '85px', height: 'auto', objectFit: 'contain', flexShrink: 0, marginTop: '4px' }} 
                          />
                          <div style={{ fontSize: '7.8px', lineHeight: '1.38', color: '#000000' }}>
                            <div style={{ fontWeight: 800, fontSize: '10.5px', lineHeight: '1.2', letterSpacing: '0.3px', marginBottom: '3px' }}>
                              GENERAL PRECISION<br />SPINDLES
                            </div>
                            <div>SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI</div>
                            <div>DHABA,NANDED PHATA SINHAGAD ROAD PUNE-411041 ,</div>
                            <div><Phone size={8} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '2px' }} />+919764252188 / 9764032929</div>
                            <div>Email: process@gpsspindles.net</div>
                            <div>GSTIN: 27AATFG1527D1ZF</div>
                            <div>State: 27-Maharashtra</div>
                          </div>
                        </div>

                        {/* Right: Metadata Grid (3 rows: Row 1 = Invoice No/Date, Row 2 = Place of supply/empty corner, Row 3 = empty bottom space) */}
                        <div style={{ borderLeft: '1px solid #b8b8b8', display: 'flex', flexDirection: 'column' }}>
                          {/* Row 1: Invoice No. & Date */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                            <div style={{ padding: '3.5px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Invoice No.</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedInvoice.invoiceNumber || selectedInvoice.id}
                              </div>
                            </div>
                            <div style={{ padding: '3.5px 6px', borderLeft: '1px solid #b8b8b8' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Date</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedInvoice.date || selectedInvoice.invoiceDate || '30-09-2026'}
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Place of supply & empty right corner */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                            <div style={{ padding: '3.5px 6px' }}>
                              <div style={{ fontSize: '7px', color: '#000000' }}>Place of supply</div>
                              <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                                {selectedInvoice.placeOfSupply || selectedInvoice.state || '27-Maharashtra'}
                              </div>
                            </div>
                            <div style={{ borderLeft: '1px solid #b8b8b8' }}></div>
                          </div>

                          {/* Row 3: Empty bottom column space */}
                          <div style={{ flex: 1, minHeight: '34px' }}></div>
                        </div>

                      </div>

                      {/* 2. Bill To Box */}
                      <div style={{ padding: '7px 10px', borderBottom: '1px solid #b8b8b8', fontSize: '8px', lineHeight: '1.4' }}>
                        <div style={{ fontSize: '7.5px', color: '#000000', marginBottom: '2px' }}>Bill To</div>
                        <div style={{ fontWeight: 800, fontSize: '9.5px', color: '#000000', marginBottom: '2px' }}>
                          {selectedInvoice.customer}
                        </div>
                        <div style={{ whiteSpace: 'pre-line', color: '#000000', marginBottom: '2px' }}>
                          {selectedInvoice.billingAddress || selectedInvoice.customerAddress}
                        </div>
                        <div>Contact No. : {selectedInvoice.contactNo || selectedInvoice.customerContact || '8600280084'}</div>
                        <div>GSTIN : {selectedInvoice.gstin || selectedInvoice.customerGstin || '27AIBPB6756H1ZB'}</div>
                        <div>State: {selectedInvoice.placeOfSupply || selectedInvoice.state || '27-Maharashtra'}</div>
                        {(selectedInvoice.poNumber || selectedInvoice.purchaseOrderNo) && (
                          <div>Purchase Order No : {selectedInvoice.poNumber || selectedInvoice.purchaseOrderNo}</div>
                        )}
                      </div>

                      {/* 3. Line Items Table (6 columns: #, Item name, HSN/ SAC, Quantity, Price/ Unit, Amount) */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.8px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#ffffff', borderBottom: '1px solid #b8b8b8' }}>
                            <th style={{ width: '30px', borderRight: '1px solid #b8b8b8', padding: '4px', textAlign: 'left', fontWeight: 700 }}>#</th>
                            <th style={{ borderRight: '1px solid #b8b8b8', padding: '4px 6px', fontWeight: 700 }}>Item name</th>
                            <th style={{ width: '90px', borderRight: '1px solid #b8b8b8', padding: '4px 6px', fontWeight: 700 }}>HSN/ SAC</th>
                            <th style={{ width: '60px', borderRight: '1px solid #b8b8b8', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>Quantity</th>
                            <th style={{ width: '90px', borderRight: '1px solid #b8b8b8', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>Price/ Unit</th>
                            <th style={{ width: '90px', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCalculations.items.map((item, idx) => {
                            const q = Number(item.qty != null ? item.qty : (item.quantity || 1));
                            const r = Number(item.unitPrice != null ? item.unitPrice : (item.rate || item.price || 0));
                            const itemTotal = (q > 0 && r > 0) ? (q * r) : Number(item.total != null ? item.total : 0);
                            return (
                              <tr key={idx}>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '4px', textAlign: 'left' }}>
                                  {idx + 1}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '4px 6px', fontWeight: 700 }}>
                                  {item.name || item.product || item.desc}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '4px 6px' }}>
                                  {item.hsn || item.hsn_sac || ''}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '4px 6px', textAlign: 'right' }}>
                                  {q}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '4px 6px', textAlign: 'right' }}>
                                  ₹ {r.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', padding: '4px 6px', textAlign: 'right' }}>
                                  ₹ {itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Table Total Row */}
                          <tr style={{ fontWeight: 700 }}>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '4px' }}></td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '4px 6px', textAlign: 'left' }}>Total</td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '4px 6px' }}></td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '4px 6px', textAlign: 'right' }}>
                              {selectedCalculations.totalQty}
                            </td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '4px 6px' }}></td>
                            <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                              ₹ {selectedCalculations.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 4. Middle Section: Words & Description on left, Amounts on right */}
                      <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderTop: '1px solid #b8b8b8', borderBottom: '1px solid #b8b8b8' }}>
                        
                        {/* Left: Invoice Amount in Words & Scope */}
                        <div>
                          {/* Invoice Amount in Words */}
                          <div style={{ padding: '5px 8px', borderBottom: '1px solid #b8b8b8' }}>
                            <div style={{ fontSize: '7.5px', color: '#000000' }}>Invoice Amount in Words</div>
                            <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#000000', marginTop: '2px' }}>
                              {numberToIndianWords(selectedCalculations.grandTotal)}
                            </div>
                          </div>

                          {/* Description */}
                          <div style={{ padding: '6px 8px', fontSize: '7.8px', color: '#000000', lineHeight: '1.3' }}>
                            <div style={{ color: '#000000' }}>Description</div>
                            {selectedInvoice.spindleSerial && (
                              <div style={{ fontWeight: 700, marginTop: '2px' }}>
                                SERIAL NO. {selectedInvoice.spindleSerial}
                              </div>
                            )}
                            <div style={{ fontWeight: 700, marginTop: '2px' }}>
                              SCOPE OF WORK :-
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px', fontSize: '7.4px', lineHeight: '1.45', fontWeight: 700 }}>
                              {(() => {
                                const rawScope = Array.isArray(selectedInvoice.scopeOfWork)
                                  ? selectedInvoice.scopeOfWork
                                  : (selectedInvoice.scopeOfWork || `1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. SHAFT SLEEVING\n6. STATIC TEST\n7. ASSEMBLY\n8. DYNAMIC TEST`).split('\n');
                                return rawScope.map((line, idx) => (
                                  <div key={idx}>{line.trim()}</div>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amounts Box matching Tax Invoice_INV2026-27 265_PS MAINTENANCE.pdf */}
                        <div style={{ borderLeft: '1px solid #b8b8b8', padding: '6px 10px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: '8px', color: '#000000', marginBottom: '4px', fontWeight: 600 }}>Amounts</div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0' }}>
                            <span>Sub Total</span>
                            <span>₹ {selectedCalculations.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0' }}>
                            <span>Tax (18%)</span>
                            <span>₹ {selectedCalculations.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div style={{ borderTop: '1px solid #b8b8b8', margin: '4px -10px' }}></div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.8px', fontWeight: 800, padding: '3px 0' }}>
                            <span>Total</span>
                            <span>₹ {selectedCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0', color: '#000000' }}>
                            <span>Received</span>
                            <span>₹ {selectedCalculations.received.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div style={{ borderTop: '1px solid #b8b8b8', margin: '4px -10px' }}></div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3px 0', color: '#000000' }}>
                            <span>Balance</span>
                            <span>₹ {selectedCalculations.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                      </div>

                      {/* 5. GST Tax Summary Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.4px', textAlign: 'left', borderBottom: '1px solid #b8b8b8' }}>
                        <thead>
                          <tr style={{ background: '#ffffff', borderBottom: '1px solid #b8b8b8' }}>
                            <th rowSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'center', fontWeight: 700 }}>HSN/ SAC</th>
                            <th rowSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'center', fontWeight: 700 }}>Taxable amount</th>
                            {!selectedCalculations.isInterState ? (
                              <>
                                <th colSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>CGST</th>
                                <th colSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>SGST</th>
                              </>
                            ) : (
                              <th colSpan={2} style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>IGST</th>
                            )}
                            <th rowSpan={2} style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 700 }}>Total Tax Amount</th>
                          </tr>
                          <tr style={{ background: '#ffffff', borderBottom: '1px solid #b8b8b8' }}>
                            {!selectedCalculations.isInterState ? (
                              <>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Rate</th>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Amount</th>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Rate</th>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Amount</th>
                              </>
                            ) : (
                              <>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Rate</th>
                                <th style={{ borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>Amount</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCalculations.hsnList.map((h, idx) => {
                            const cgstAmt = Math.round(h.taxable * 0.09);
                            const sgstAmt = Math.round(h.taxable * 0.09);
                            const totalTax = cgstAmt + sgstAmt;
                            return (
                              <tr key={idx}>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'left' }}>
                                  {h.hsn}
                                </td>
                                <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                                  ₹ {h.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                {!selectedCalculations.isInterState ? (
                                  <>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>9%</td>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>
                                      ₹ {cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>9%</td>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>
                                      ₹ {sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>18%</td>
                                    <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>
                                      ₹ {totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </>
                                )}
                                <td style={{ borderBottom: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right', fontWeight: 700 }}>
                                  ₹ {totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Tax Total Row */}
                          <tr style={{ fontWeight: 700 }}>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>Total</td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                              ₹ {selectedCalculations.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {!selectedCalculations.isInterState ? (
                              <>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px' }}></td>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>
                                  ₹ {selectedCalculations.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px' }}></td>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>
                                  ₹ {selectedCalculations.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px' }}></td>
                                <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}>
                                  ₹ {selectedCalculations.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </>
                            )}
                            <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                              ₹ {selectedCalculations.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 6. Bottom 3-Column Footer Box matching Proforma & Quotation exact layout */}
                      <div style={{ display: 'grid', gridTemplateColumns: '29% 41% 30%', fontSize: '7.2px', color: '#000000', flex: 1, minHeight: 0 }}>
                        
                        {/* Col 1: Bank Details with UPI QR code */}
                        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontWeight: 800, fontSize: '8.5px', marginBottom: '6px' }}>Bank Details</div>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            {/* Dynamic Amount-Wise UPI QR Code */}
                            <UpiQrCode 
                              amount={selectedCalculations.balance > 0 ? selectedCalculations.balance : selectedCalculations.grandTotal}
                              quoteNo={selectedInvoice.invoiceNo || selectedInvoice.id}
                              upiId={selectedInvoice.bankDetails?.upiId || getActiveUpiId()}
                              payeeName={selectedInvoice.bankDetails?.accountHolder || 'GENERAL PRECISION SPINDLES'}
                              size={48}
                              onNotify={onNotify}
                            />

                            <div style={{ fontSize: '7.4px', lineHeight: '1.45' }}>
                              <div style={{ marginBottom: '4px' }}>Name : ICICI BANK LIMITED, PUNE<br />NANDED CITY</div>
                              <div style={{ marginBottom: '4px' }}>Account No. : 349105000701</div>
                              <div style={{ marginBottom: '4px' }}>IFSC code : ICIC0003491</div>
                              <div style={{ marginBottom: '4px' }}>
                                UPI ID : <span className="mono" style={{ color: '#7A1F3D', fontWeight: 600 }}>{selectedInvoice.bankDetails?.upiId || getActiveUpiId()}</span>
                              </div>
                              <div>Account holder's name : GENERAL<br />PRECISION SPINDLES</div>
                            </div>
                          </div>
                        </div>

                        {/* Col 2: Terms and conditions with MSME declaration */}
                        <div style={{ borderLeft: '1px solid #b8b8b8', padding: '8px 10px' }}>
                          <div style={{ fontWeight: 800, fontSize: '8.5px', marginBottom: '6px' }}>Terms and conditions</div>
                          <div style={{ fontSize: '7px', lineHeight: '1.5', color: '#000000', whiteSpace: 'pre-line' }}>
                            {String(selectedInvoice.terms || `We declare that this invoice shows the actual price of the goods\ndescribed and that all particulars are true and correct.\nBank Details:\nICICI Bank Ltd(Nanded City Branch)\nA/c No : 349105000701\nIFSC Code: ICIC0003491\nMSME (UDYAM ADHAR) NO-MH26A0189736\nTYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING\nMAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,INTEGRATED,SPINDLE REPAIRING ,SPINDLE MANUFACTURING.`).replace('the goods described', 'the goods\ndescribed')}
                          </div>
                        </div>

                        {/* Col 3: Authorized Signatory */}
                        <div style={{ borderLeft: '1px solid #b8b8b8', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', boxSizing: 'border-box' }}>
                          <div style={{ fontSize: '8px', fontWeight: 400, textAlign: 'center' }}>
                            For : GENERAL PRECISION SPINDLES
                          </div>
                          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '8.5px', paddingBottom: '8px' }}>
                            Authorized Signatory
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a tax invoice from the list or create a new one to view details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT TAX INVOICE MODAL (With Quotation & Proforma Invoice Import) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '20px' }}>
            <span>{editingInvoiceId ? `Edit Tax Invoice: ${formState.invoiceNumber || editingInvoiceId}` : "+ Create Tax Invoice"}</span>
            {!editingInvoiceId && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                title="Clear all form fields to start fresh"
                style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-color)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-main)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger-light)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface-subtle)'; e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
              >
                <RefreshCw size={12} />
                <span>Reset / Clear Form</span>
              </button>
            )}
          </div>
        }
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
                className="btn btn-primary" 
                onClick={() => handleSaveInvoice(false)}
                title="Generate and save Tax Invoice"
                style={{ fontWeight: 600, background: 'linear-gradient(135deg, #7A1F3D 0%, #5B132B 100%)', border: 'none', color: '#fff', gap: '6px' }}
              >
                <FileCheck size={14} />
                <span>{editingInvoiceId ? "Update Tax Invoice" : "Generate Tax Invoice"}</span>
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveInvoice(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Dual Import Sources (Only shown in creation mode) */}
          {!editingInvoiceId && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Source 1: Import from Proforma Invoice */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700, fontSize: '12px' }}>
                    <Sparkles size={14} color="#16a34a" />
                    <span>Import from Proforma Invoice</span>
                  </div>
                  {selectedProformaId && (
                    <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Linked: {selectedProformaId}
                    </span>
                  )}
                </div>
                <CustomSelect
                  searchable={true}
                  placeholder="Search by PI # or customer name..."
                  value={selectedProformaId}
                  onChange={(e) => handleImportProforma(e.target.value)}
                  options={[
                    { value: '', label: '-- Select / Search Proforma Invoice --' },
                    ...proformaInvoices.map(p => ({
                      value: p.id || p.piNumber || p.dbId,
                      label: `${p.piNumber || p.id} • ${p.customer} (₹${Number(p.totalAmount || 0).toLocaleString('en-IN')})`
                    }))
                  ]}
                  style={{ width: '100%', fontSize: '12px' }}
                />
              </div>

              {/* Source 2: Import from Approved Quotation */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontWeight: 700, fontSize: '12px' }}>
                    <FileCheck size={14} color="#2563eb" />
                    <span>Import from Approved Quotation</span>
                  </div>
                  {selectedQuoteId && (
                    <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Linked: {selectedQuoteId}
                    </span>
                  )}
                </div>
                <CustomSelect
                  searchable={true}
                  placeholder="Search approved quote by # or customer name..."
                  value={selectedQuoteId}
                  onChange={(e) => handleImportQuotation(e.target.value)}
                  options={[
                    { value: '', label: '-- Select / Search Approved Quotation --' },
                    ...approvedQuotations.map(q => ({
                      value: q.id || q.quoteNumber || q.dbId,
                      label: `${q.quoteNumber || q.id} • ${q.customer} (₹${Number(q.totalAmount || 0).toLocaleString('en-IN')})`
                    }))
                  ]}
                  style={{ width: '100%', fontSize: '12px' }}
                />
              </div>
            </div>
          )}

          {/* Section 1: Customer Information & Invoice Details */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12.5px' }}>
              <Building2 size={15} />
              <span>Customer Information & Invoice Details</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Customer Name (Preset or Custom) *</label>
                <input 
                  list="tax-customer-presets"
                  className="form-control" 
                  value={formState.customer}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  placeholder="e.g. PS MAINTENANCE SERVICE"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required 
                />
                <datalist id="tax-customer-presets">
                  {PRESET_CUSTOMERS.map(c => <option key={c.name} value={c.name} />)}
                </datalist>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Customer Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="service@psmaintenance.in"
                  value={formState.customerEmail}
                  onChange={(e) => setFormState(prev => ({ ...prev, customerEmail: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Contact Phone</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  placeholder="8600280084"
                  value={formState.customerContact}
                  onChange={(e) => setFormState(prev => ({ ...prev, customerContact: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Customer Address / Billing Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formState.billingAddress}
                  onChange={(e) => setFormState(prev => ({ ...prev, billingAddress: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Customer GSTIN</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  placeholder="27AIBPB6756H1ZB"
                  value={formState.gstin}
                  onChange={(e) => setFormState(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Place of Supply / State</label>
                <select
                  className="form-control"
                  value={formState.placeOfSupply}
                  onChange={(e) => setFormState(prev => ({ ...prev, placeOfSupply: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="27-Maharashtra">27-Maharashtra (CGST 9% + SGST 9%)</option>
                  <option value="23-Madhya Pradesh">23-Madhya Pradesh (IGST 18%)</option>
                  <option value="24-Gujarat">24-Gujarat (IGST 18%)</option>
                  <option value="29-Karnataka">29-Karnataka (IGST 18%)</option>
                  <option value="33-Tamil Nadu">33-Tamil Nadu (IGST 18%)</option>
                  <option value="36-Telangana">36-Telangana (IGST 18%)</option>
                  {![
                    '27-Maharashtra',
                    '23-Madhya Pradesh',
                    '24-Gujarat',
                    '29-Karnataka',
                    '33-Tamil Nadu',
                    '36-Telangana'
                  ].includes(formState.placeOfSupply) && formState.placeOfSupply && (
                    <option value={formState.placeOfSupply}>{formState.placeOfSupply}</option>
                  )}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Invoice Number *</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formState.invoiceNumber}
                  onChange={(e) => setFormState(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="INV2026-27/265"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Invoice Date *</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  placeholder="DD-MM-YYYY"
                  value={formState.invoiceDate}
                  onChange={(e) => setFormState(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required 
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Payment Due Date</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  placeholder="DD-MM-YYYY"
                  value={formState.dueDate}
                  onChange={(e) => setFormState(prev => ({ ...prev, dueDate: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Purchase Order No.</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  placeholder="e.g. VERBAL or PO-2026-081"
                  value={formState.poNumber}
                  onChange={(e) => setFormState(prev => ({ ...prev, poNumber: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Spindle Specifications & Technical Scope */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12.5px' }}>
              <ShieldCheck size={15} />
              <span>Spindle Specifications & Scope of Work</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Spindle Serial No.</label>
              <input 
                type="text" 
                className="form-control mono" 
                placeholder="e.g. IMMXXVI (M77-002)"
                value={formState.spindleSerial}
                onChange={(e) => setFormState(prev => ({ ...prev, spindleSerial: e.target.value }))}
                style={{ width: '100%', maxWidth: '340px', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Appears in description and header box on official Tax Invoice
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Scope of Work (Numbered Technical Description)</label>
              <textarea 
                className="form-control" 
                rows={4}
                value={formState.scopeOfWork}
                onChange={(e) => setFormState(prev => ({ ...prev, scopeOfWork: e.target.value }))}
                placeholder="1. DISMANTLE&#10;2. CLEANING&#10;3. INSPECTION&#10;4. BEARING REPLACEMENT..."
                style={{ fontSize: '11.5px', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box', height: 'auto', minHeight: '80px', display: 'block' }}
              />
            </div>
          </div>

          {/* Section 3: Line Items (Tax Invoice Breakdown) */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#7A1F3D' }}>Line Items (Tax Invoice Breakdown)</span>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleAddItem}
                style={{ height: '26px', fontSize: '11.5px', padding: '0 10px', gap: '4px' }}
              >
                <Plus size={12} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', minWidth: '700px', fontSize: '11.5px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 8px', width: '32px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '6px 8px', width: 'auto', textAlign: 'left' }}>Item name</th>
                    <th style={{ padding: '6px 8px', width: '95px', textAlign: 'center' }}>HSN/ SAC</th>
                    <th style={{ padding: '6px 8px', width: '65px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', width: '110px', textAlign: 'right' }}>Price/ Unit (₹)</th>
                    <th style={{ padding: '6px 8px', width: '110px', textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ padding: '6px 8px', width: '32px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formState.items.map((item, idx) => {
                    const q = Number(item.qty) || 0;
                    const r = Number(item.unitPrice || item.rate) || 0;
                    const lineTotal = q * r;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Item description"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            style={{ height: '28px', fontSize: '11.5px', width: '100%', boxSizing: 'border-box' }}
                            required
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control mono" 
                            placeholder="84669390"
                            value={item.hsn}
                            onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            className="form-control mono" 
                            placeholder="1"
                            value={item.qty}
                            onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}
                            min="1"
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input 
                            type="number" 
                            className="form-control mono" 
                            placeholder="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                            style={{ height: '28px', fontSize: '11.5px', textAlign: 'right', width: '100%', boxSizing: 'border-box' }}
                            min="0"
                          />
                        </td>
                        <td className="mono" style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItem(item.id)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
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

            {/* Clean Live Calculations Summary (No payment/advance clutter) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <div style={{ width: '280px', background: '#F8FAF9', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sub Total (Taxable):</span>
                  <span className="mono">₹{formCalculations.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tax (18% {formCalculations.isInterState ? 'IGST' : 'CGST+SGST'}):</span>
                  <span className="mono">₹{formCalculations.taxTotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 800, color: 'var(--primary)', fontSize: '13px' }}>
                  <span>Grand Total:</span>
                  <span className="mono">₹{formCalculations.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Terms and Conditions & Declarations */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#7A1F3D', fontWeight: 700, fontSize: '12.5px' }}>
              <FileText size={15} />
              <span>Terms & Conditions and Bank Declarations (Footer Box)</span>
            </div>
            <textarea 
              className="form-control" 
              rows={4}
              value={formState.terms}
              onChange={(e) => setFormState(prev => ({ ...prev, terms: e.target.value }))}
              placeholder="Terms and conditions, declarations, bank details..."
              style={{ fontSize: '11px', lineHeight: '1.4', width: '100%', boxSizing: 'border-box', height: 'auto', minHeight: '80px', display: 'block' }}
            />
          </div>

        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && invoiceToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Tax Invoice"
          maxWidth="440px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleDeleteInvoice}
                disabled={isDeleting}
                style={{ background: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }}
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'Deleting...' : 'Delete Tax Invoice'}</span>
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '50%', color: '#dc2626' }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                Are you sure you want to delete Tax Invoice {invoiceToDelete.invoiceNumber || invoiceToDelete.id}?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Customer: <strong>{invoiceToDelete.customer}</strong> • Total Value: <strong>{invoiceToDelete.amount}</strong>. This will permanently remove the invoice and its line items.
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Outlook-Style Email Composer */}
      {isEmailComposerOpen && emailDoc && (
        <OutlookEmailComposer 
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          documentData={emailDoc}
          documentType="invoice"
          onNotify={onNotify}
          onSent={handleEmailSent}
        />
      )}
    </div>
  );
}
