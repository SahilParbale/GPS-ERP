import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { TablePageSkeleton } from '../components/common/Skeleton';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { exportContactsDirectoryPdf } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';
import { customerService } from '../services/database/customerService';
import { salesService } from '../services/database/salesService';
import { proformaInvoiceService } from '../services/database/proformaInvoiceService';
import { invoiceService } from '../services/database/invoiceService';
import { contactService } from '../services/database/contactService';
import { isCleanSlateMode } from '../utils/dataMode';
import {
  INTERNAL_GPS_CCS,
  PRESET_EMAIL_GROUPS,
  MASTER_CONTACTS
} from '../data/contactsData';
import { SEED_QUOTATIONS, SEED_CUSTOMERS } from '../data/mockData';
import {
  Search, Plus, Download, RefreshCw, AlertCircle, AlertTriangle, Save, X,
  Trash2, CheckCircle2, Edit3, ChevronDown, Filter,
  Users, Building2, Phone, Mail, MapPin, CreditCard, Hash,
  ArrowUpDown, Eye, FileText, Sparkles, Send, Copy, Check,
  ExternalLink, AtSign, Briefcase, Info, Tag, ShieldCheck, Truck, Wrench
} from 'lucide-react';

// ─── Column Definitions for Unified Excel Grid ──────────────────────────────
const COLUMNS = [
  { key: 'idx', label: '#', width: 44, fixed: true, readOnly: true, align: 'center' },
  { key: 'name', label: 'Company / Account Name', width: 220, fixed: true, icon: Building2, required: true },
  { key: 'category', label: 'Category', width: 110, icon: Tag, align: 'center' },
  { key: 'contactName', label: 'Contact Person', width: 160, icon: Users },
  { key: 'designation', label: 'Role / Designation', width: 170, icon: Briefcase },
  { key: 'phone', label: 'Phone / Mobile', width: 140, icon: Phone, type: 'tel' },
  { key: 'email', label: 'Direct Email (TO)', width: 210, icon: Mail, type: 'email' },
  { key: 'ccEmails', label: 'Pre-Stored CCs', width: 200, icon: AtSign, readOnly: true },
  { key: 'quotesCount', label: 'Sales & Quotes', width: 125, icon: FileText, readOnly: true, align: 'center' },
  { key: 'billingAddress', label: 'Plant Address / Location', width: 250, icon: MapPin, multiline: true },
  { key: 'city', label: 'City', width: 110 },
  { key: 'state', label: 'State', width: 110 },
  { key: 'gstin', label: 'GSTIN', width: 160, icon: Hash, mono: true },
  { key: 'creditTerms', label: 'Payment Terms', width: 140, icon: CreditCard },
  { key: 'industry', label: 'Industry / Tier', width: 170 },
  { key: 'totalBusiness', label: 'Total Business', width: 125, readOnly: true, align: 'right', mono: true },
  { key: 'outstanding', label: 'Outstanding', width: 115, readOnly: true, align: 'right', mono: true },
];

const EMPTY_ROW = {
  id: null, dbId: null, source: 'Manual',
  name: '', category: 'Customer', tier: 'Tier 1 Enterprise Client',
  contactName: '', designation: 'Procurement Manager', department: 'Procurement',
  phone: '', email: '', ccList: [], ccEmails: '',
  billingAddress: '', city: '', state: '', gstin: '',
  creditTerms: 'Net 30 Days', industry: 'Precision Engineering',
  quotesCount: 0, quotes: [], proformas: [], invoices: [],
  totalBusiness: '₹0', outstanding: '₹0', _isNew: true, _isDirty: false
};

const formatCurrency = (n) => {
  if (!n || isNaN(n) || Number(n) <= 0) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

// ─── Deduplication & Data Quality Helpers ─────────────────────────────────────
export const isJunkName = (str) => {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim().toLowerCase();
  if (s.length < 3) return true;
  if (/^(hfghh|test|demo|asdf|qwerty|xyz|temp|sample|foo|bar|null|undefined)$/i.test(s)) return true;
  if (s.length >= 4 && !/[aeiouy0-9]/i.test(s)) return true;
  if (/^(.)\1+$/i.test(s)) return true;
  return false;
};

export const getCanonicalKey = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[-–—/\\(),.&]/g, ' ')
    .replace(/\b(limited|ltd|pvt|private|inc|corp|corporation|division|plant|chakan|talegaon|bhosari|sanand|pune|chennai|coimbatore|india)\b/gi, ' ')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

// ─── Extract unique clients from Quotations / PI / Invoices ──────────────────
function extractClientsFromDocs(quotations = [], proformas = [], invoices = []) {
  const map = new Map();

  const upsert = (rawName, partial, source) => {
    if (!rawName || isJunkName(rawName)) return;
    const cKey = getCanonicalKey(rawName);
    if (!cKey) return;

    if (!map.has(cKey)) {
      map.set(cKey, {
        ...EMPTY_ROW,
        name: rawName.trim(),
        source,
        _isNew: false,
        quotes: [],
        proformas: [],
        invoices: []
      });
    }
    const existing = map.get(cKey);

    // Keep the cleanest, most official legal name
    if (rawName.trim().length > existing.name.length && !rawName.includes('-')) {
      existing.name = rawName.trim();
    }

    if (!existing.contactName && partial.contactName) existing.contactName = partial.contactName;
    if (!existing.phone && partial.phone) existing.phone = partial.phone;
    if (!existing.email && partial.email) existing.email = partial.email;
    if (!existing.billingAddress && partial.billingAddress) existing.billingAddress = partial.billingAddress;
    if (!existing.city && partial.city) existing.city = partial.city;
    if (!existing.state && partial.state) existing.state = partial.state;
    if (!existing.gstin && partial.gstin) existing.gstin = partial.gstin;
    if (!existing.creditTerms && partial.creditTerms) existing.creditTerms = partial.creditTerms;
    if (!existing.industry && partial.industry) existing.industry = partial.industry;
    existing._totalNum = (existing._totalNum || 0) + (partial._totalNum || 0);
    existing._outstandingNum = (existing._outstandingNum || 0) + (partial._outstandingNum || 0);

    if (partial._quoteItem && !existing.quotes.some(q => (q.id || q.estimateNo) === (partial._quoteItem.id || partial._quoteItem.estimateNo))) {
      existing.quotes.push(partial._quoteItem);
    }
    if (partial._proformaItem && !existing.proformas.some(p => (p.id || p.proformaNo) === (partial._proformaItem.id || partial._proformaItem.proformaNo))) {
      existing.proformas.push(partial._proformaItem);
    }
    if (partial._invoiceItem && !existing.invoices.some(inv => (inv.id || inv.invoiceNumber) === (partial._invoiceItem.id || partial._invoiceItem.invoiceNumber))) {
      existing.invoices.push(partial._invoiceItem);
    }

    map.set(cKey, existing);
  };

  quotations.forEach(q => {
    const addr = q.customerAddress || q.billingAddress || q.billing_address || q.address || '';
    const name = q.customer || q.customer_name || q.company_name;
    if (!name || isJunkName(name)) return;
    upsert(name, {
      contactName: q.contactPerson || q.contact_person || q.contactName || '',
      phone: q.contactNo || q.phone || q.contact_phone || '',
      email: q.customerEmail || q.email || '',
      billingAddress: addr,
      city: q.city || '',
      state: (q.placeOfSupply || q.state || '').replace(/^\d+-/, '').trim(),
      gstin: q.gstin || q.customer_gstin || '',
      _totalNum: Number(q.totalAmount || q.total_amount || 0),
      _quoteItem: {
        id: q.id || q.quotation_number,
        estimateNo: q.estimateNo || q.quotation_number || q.id,
        date: q.date || q.quotation_date || '2026-09-07',
        spindleSerial: q.spindleSerial || q.spindle_serial || '—',
        scopeOfWork: Array.isArray(q.scopeOfWork) ? q.scopeOfWork.join(', ') : (q.scopeOfWork || 'Spindle Overhaul'),
        totalAmount: Number(q.totalAmount || q.total_amount || 0),
        status: q.status || 'Under Review'
      }
    }, 'Quotation');
  });

  proformas.forEach(p => {
    const addr = p.billingAddress || p.customerAddress || '';
    const name = p.customer || p.customerFullName;
    if (!name || isJunkName(name)) return;
    upsert(name, {
      contactName: p.customerContact || p.contactPerson || '',
      phone: p.customerContact || p.contactNo || '',
      email: p.customerEmail || '',
      billingAddress: addr,
      city: p.city || '',
      state: (p.placeOfSupply || p.state || '').replace(/^\d+-/, '').trim(),
      gstin: p.gstin || '',
      _totalNum: Number(p.amountNum || p.totalAmount || 0),
      _proformaItem: {
        id: p.id,
        proformaNo: p.proformaNo || p.id,
        date: p.date,
        totalAmount: Number(p.amountNum || p.totalAmount || 0),
        status: p.status || 'Pending'
      }
    }, 'Proforma');
  });

  invoices.forEach(inv => {
    const addr = inv.customer_address || inv.customerAddress || inv.billing_address || '';
    const name = inv.customer_name || inv.customer || inv.customerName;
    if (!name || isJunkName(name)) return;
    upsert(name, {
      contactName: inv.contact_person || inv.contactPerson || '',
      phone: inv.phone || '',
      email: inv.email || '',
      billingAddress: addr,
      city: inv.city || '',
      state: inv.state || '',
      gstin: inv.customer_gstin || inv.gstin || '',
      _totalNum: Number(inv.amountNum || inv.totalAmount || 0),
      _outstandingNum: Number(inv.balanceNum || inv.balanceAmount || 0),
      _invoiceItem: {
        id: inv.id,
        invoiceNumber: inv.invoice_number || inv.invoiceNumber || inv.id,
        date: inv.invoice_date || inv.date,
        totalAmount: Number(inv.amountNum || inv.totalAmount || 0),
        balanceAmount: Number(inv.balanceNum || inv.balanceAmount || 0),
        status: inv.status || 'Issued'
      }
    }, 'Invoice');
  });

  return Array.from(map.values()).map(c => ({
    ...c,
    quotesCount: c.quotes?.length || 0,
    quotesList: c.quotes || [],
    totalBusiness: formatCurrency(c._totalNum),
    outstanding: formatCurrency(c._outstandingNum)
  }));
}

// ─── Main Component: Unified Client Directory in Excel View ──────────────────
export default function CustomersScreen({ onNavigate, onNotify }) {
  const { role, profile } = useAuth();
  const userRole = (profile?.role?.code || profile?.role || role?.code || role || '').toUpperCase();
  const canMutateCustomer = ['ADMIN', 'MANAGEMENT', 'SALES'].includes(userRole);
  const canMutateSupplier = ['ADMIN', 'MANAGEMENT', 'PURCHASE', 'STORES'].includes(userRole);
  const canAddAny = canMutateCustomer || canMutateSupplier;

  // ───────────────────────────────────────────────────────────────────────────
  // STATE: Excel Grid Rows & Filtering
  // ───────────────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // Editing state for table grid
  const [editingCell, setEditingCell] = useState(null); // { rowId, colKey }
  const [editValue, setEditValue] = useState('');
  const [savingRowId, setSavingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);

  // Delete Client Confirmation Modal State
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, withEmail: 0, withGstin: 0, totalBiz: 0 });

  const inputRef = useRef(null);
  const tableRef = useRef(null);

  // Email Composer State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDocData, setComposerDocData] = useState(null);
  const [composerDocType, setComposerDocType] = useState('quotation');

  // Add / Edit Client Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    companyName: '',
    category: 'Customer',
    tier: 'Tier 1 - Industrial Client',
    location: '',
    gstin: '',
    primaryName: '',
    primaryRole: 'DGM - Procurement',
    primaryDept: 'Procurement',
    primaryEmail: '',
    primaryPhone: '',
    ccEmailsText: '',
    notes: ''
  });

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Client Quotations Modal State
  const [selectedClientForQuotes, setSelectedClientForQuotes] = useState(null);
  const [isQuotesModalOpen, setIsQuotesModalOpen] = useState(false);

  // ── Handlers to interact with Sales & Quotes ──
  const handleCreateQuoteForClient = (client) => {
    const clientName = client.name || client.companyName || '';
    const clientAddr = client.billingAddress || client.location || client.billing_address || '';
    const contactPerson = client.contactName || client.primaryContact?.name || '';
    const contactPhone = client.phone || client.primaryContact?.phone || '';
    const customerEmail = client.email || client.primaryContact?.email || '';
    const gstin = client.gstin || '';
    const state = client.state || '';

    localStorage.setItem('gps_sales_prefill_customer', JSON.stringify({
      customer: clientName,
      customerAddress: clientAddr,
      contactPerson,
      contactNo: contactPhone,
      customerEmail,
      gstin,
      state,
      placeOfSupply: state
    }));

    if (onNotify) onNotify(`Opening Sales & Quotes desk for ${clientName}...`);
    if (onNavigate) onNavigate('sales');
  };

  const handleViewQuotesForClient = (client) => {
    const clientName = client.name || client.companyName || '';
    localStorage.setItem('gps_sales_filter_customer', clientName);
    if (onNotify) onNotify(`Filtering Sales & Quotes for ${clientName}...`);
    if (onNavigate) onNavigate('sales');
  };

  const handleOpenQuotesModal = (client) => {
    setSelectedClientForQuotes(client);
    setIsQuotesModalOpen(true);
  };

  // ── Compose Direct Email ──
  const handleSendEmailForRow = (row) => {
    setComposerDocData({
      id: row.dbId || row.id,
      type: 'client_communication',
      customer: row.name,
      customerFullName: row.name,
      customerEmail: row.email,
      customerContact: row.contactName,
      primaryEmail: row.email,
      ccList: row.ccList || [],
      to: row.email,
      city: row.city,
      state: row.state,
      gstin: row.gstin,
      totalAmount: row.totalBusiness || '₹0'
    });
    setComposerDocType('client_communication');
    setIsComposerOpen(true);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // DATA LOADING: Merging DB Customers, Directory Contacts & Documents
  // ───────────────────────────────────────────────────────────────────────────
  const loadLedgerData = useCallback(async () => {
    setIsLedgerLoading(true);
    setLedgerError(null);
    try {
      const [dbCustRes, quotesRes, piRes, invRes, unifiedContactsRes] = await Promise.allSettled([
        customerService.getAll(),
        salesService.getAll(),
        proformaInvoiceService.getAll(),
        invoiceService.getAll(),
        contactService.getUnifiedDirectory()
      ]);

      const dbCusts = dbCustRes.status === 'fulfilled' && !dbCustRes.value?.error
        ? (dbCustRes.value?.data || dbCustRes.value || [])
        : [];
      let quotes = quotesRes.status === 'fulfilled' && !quotesRes.value?.error
        ? (quotesRes.value?.data || quotesRes.value || [])
        : [];
      let pis = piRes.status === 'fulfilled' && !piRes.value?.error
        ? (piRes.value?.data || piRes.value || [])
        : [];
      let invs = invRes.status === 'fulfilled' && !invRes.value?.error
        ? (invRes.value?.data || invRes.value || [])
        : [];

      // Merge local storage user quotes if any exist
      try {
        if (typeof localStorage !== 'undefined') {
          const localQuotes = JSON.parse(localStorage.getItem('gps_local_quotations') || '[]');
          if (Array.isArray(localQuotes) && localQuotes.length > 0) {
            localQuotes.forEach(lq => {
              if (!quotes.some(q => (q.id && q.id === lq.id) || (q.estimateNo && q.estimateNo === lq.estimateNo))) {
                quotes.push(lq);
              }
            });
          }
        }
      } catch (_e) { }

      // Fall back to SEED_QUOTATIONS so client information from Sales Enquiries, Quotations & Commercial Orders is automatically available
      if (quotes.length === 0) {
        quotes = SEED_QUOTATIONS || [];
      }

      // Directory contacts
      let directoryContacts = unifiedContactsRes.status === 'fulfilled' && !unifiedContactsRes.value?.error
        ? (unifiedContactsRes.value?.data || [])
        : [];

      // If directory was empty, use baseline master contacts
      if (directoryContacts.length === 0) {
        directoryContacts = MASTER_CONTACTS || [];
      }

      // Extract unique client accounts from Sales Quotations, Proforma Invoices, and Tax Invoices
      const docClients = extractClientsFromDocs(quotes, pis, invs);

      // Baseline customer accounts from ERP database or baseline seeds
      const baselineCustomers = dbCusts.length > 0 ? dbCusts : (SEED_CUSTOMERS || []).map(sc => ({
        id: sc.id,
        name: sc.name,
        company_name: sc.name,
        industry: sc.industry,
        billing_address: sc.location,
        location: sc.location,
        city: sc.location?.split(',')?.[0]?.trim() || '',
        state: sc.location?.split(',')?.[1]?.trim() || '',
        gstin: sc.gstin,
        contact_person: sc.contactName,
        primary_phone: sc.contactPhone,
        phone: sc.contactPhone,
        email: sc.contactEmail,
        credit_terms: sc.creditTerms,
        tier: sc.rating
      }));

      // Unified canonical master map to eliminate duplicate variations (e.g. Bharat Forge Limited / Ltd / Chakan)
      const masterMap = new Map();

      const mergeIntoMaster = (account, src) => {
        const rawName = (account.companyName || account.company_name || account.name || '').trim();
        if (!rawName || isJunkName(rawName)) return;
        const cKey = getCanonicalKey(rawName);
        if (!cKey) return;

        if (!masterMap.has(cKey)) {
          masterMap.set(cKey, {
            ...EMPTY_ROW,
            id: `acc-${cKey}`,
            name: rawName,
            source: src,
            quotes: [],
            proformas: [],
            invoices: [],
            ccList: [],
            _totalNum: 0,
            _outstandingNum: 0,
            _isNew: false,
            _isDirty: false
          });
        }

        const m = masterMap.get(cKey);

        // Keep the most complete, official company name
        if (rawName.length > m.name.length && !rawName.includes('-')) {
          m.name = rawName;
        }

        if (account.dbId || account.id) {
          if (!m.dbId && typeof account.dbId === 'number') m.dbId = account.dbId;
          else if (!m.dbId && typeof account.id === 'number') m.dbId = account.id;
        }

        if (account.category) m.category = account.category;
        if (account.tier && (!m.tier || account.tier.length > m.tier.length)) m.tier = account.tier;

        // Contact person: prefer actual name over generic sourcing placeholder
        const contactName = account.primary_contact_name || account.contact_person || account.contactPerson || account.contactName || account.primaryContact?.name || '';
        if (contactName) {
          if (!m.contactName || m.contactName.startsWith('Commercial Sourcing')) {
            m.contactName = contactName;
          }
        }

        const desig = account.primaryContact?.designation || account.designation || '';
        if (desig && (!m.designation || m.designation === 'Procurement Manager')) {
          m.designation = desig;
        }

        const dept = account.primaryContact?.department || account.department || '';
        if (dept && !m.department) m.department = dept;

        const phone = account.primary_phone || account.phone || account.contactPhone || account.contactNo || account.primaryContact?.phone || '';
        if (phone && !m.phone) m.phone = phone;

        const email = account.primary_email || account.email || account.contactEmail || account.customerEmail || account.primaryContact?.email || '';
        if (email && !m.email) m.email = email;

        const addr = account.billing_address || account.billingAddress || account.address || account.location || '';
        if (addr && (!m.billingAddress || addr.length > m.billingAddress.length)) m.billingAddress = addr;

        const city = account.city || account.location?.split(',')?.[0]?.trim() || '';
        if (city && !m.city) m.city = city;

        const state = account.state || account.location?.split(',')?.[1]?.trim() || '';
        if (state && !m.state) m.state = state;

        const gstin = account.gstin || account.customer_gstin || '';
        if (gstin && !m.gstin) m.gstin = gstin;

        const creditTerms = account.payment_terms || account.credit_terms || account.creditTerms || '';
        if (creditTerms && !m.creditTerms) m.creditTerms = creditTerms;

        const industry = account.industry_segment || account.industry || account.tier || '';
        if (industry && !m.industry) m.industry = industry;

        // Merge CC lists without duplicates
        const incomingCcs = account.ccList || [];
        if (Array.isArray(incomingCcs) && incomingCcs.length > 0) {
          incomingCcs.forEach(cc => {
            const ccEmail = typeof cc === 'string' ? cc : cc.email;
            if (ccEmail && !m.ccList.some(existingCc => (typeof existingCc === 'string' ? existingCc : existingCc.email).toLowerCase() === ccEmail.toLowerCase())) {
              m.ccList.push(cc);
            }
          });
        }

        // Merge Quotes
        if (Array.isArray(account.quotes) && account.quotes.length > 0) {
          account.quotes.forEach(q => {
            const qId = q.id || q.estimateNo;
            if (!m.quotes.some(existingQ => (existingQ.id || existingQ.estimateNo) === qId)) {
              m.quotes.push(q);
            }
          });
        }

        // Merge Proformas
        if (Array.isArray(account.proformas) && account.proformas.length > 0) {
          account.proformas.forEach(p => {
            const pId = p.id || p.proformaNo;
            if (!m.proformas.some(existingP => (existingP.id || existingP.proformaNo) === pId)) {
              m.proformas.push(p);
            }
          });
        }

        // Merge Invoices
        if (Array.isArray(account.invoices) && account.invoices.length > 0) {
          account.invoices.forEach(inv => {
            const invId = inv.id || inv.invoiceNumber;
            if (!m.invoices.some(existingInv => (existingInv.id || existingInv.invoiceNumber) === invId)) {
              m.invoices.push(inv);
            }
          });
        }

        m._totalNum += (account._totalNum || 0);
        m._outstandingNum += (account._outstandingNum || 0);
      };

      // 1. Ingest Master Directory Contacts (they contain full engineering & CC distribution data)
      directoryContacts.forEach(cnt => mergeIntoMaster(cnt, 'Directory'));

      // 2. Ingest Baseline Customers
      baselineCustomers.forEach(c => mergeIntoMaster(c, 'Database'));

      // 3. Ingest Document-Derived Clients (from Quotations, Proformas, Invoices)
      docClients.forEach(dc => mergeIntoMaster(dc, 'Quotation'));

      const combined = Array.from(masterMap.values()).map(item => {
        const primaryCc = item.ccList || [];
        const ccEmailsText = primaryCc.map(cc => typeof cc === 'string' ? cc : cc.email).filter(Boolean).join(', ');

        return {
          ...item,
          ccEmails: ccEmailsText,
          quotesCount: item.quotes.length,
          totalBusiness: formatCurrency(item._totalNum),
          outstanding: formatCurrency(item._outstandingNum)
        };
      });

      combined.sort((a, b) => a.name.localeCompare(b.name));
      setRows(combined);

      const withEmail = combined.filter(r => r.email).length;
      const withGstin = combined.filter(r => r.gstin).length;
      let totalBizNum = combined.reduce((sum, r) => sum + (r._totalNum || 0), 0);

      setStats({
        total: combined.length,
        withEmail,
        withGstin,
        totalBiz: formatCurrency(totalBizNum)
      });
    } catch (err) {
      console.error('Error loading Client Directory:', err);
      setLedgerError(err.message || 'Failed to load client directory data.');
    } finally {
      setIsLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLedgerData();
    const handleSync = () => {
      loadLedgerData();
    };
    window.addEventListener('gps_quotations_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('gps_quotations_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadLedgerData]);

  const handleRefreshAll = () => {
    loadLedgerData();
    if (onNotify) onNotify('Refreshed live Client Directory.');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // SEARCH, CATEGORY FILTER & COLUMN SORT
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...rows];
    if (categoryFilter !== 'All') {
      result = result.filter(r => (r.category || 'Customer').toLowerCase() === categoryFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.contactName || '').toLowerCase().includes(q) ||
        (r.designation || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        (r.gstin || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q) ||
        (r.state || '').toLowerCase().includes(q) ||
        (r.billingAddress || '').toLowerCase().includes(q) ||
        (r.industry || '').toLowerCase().includes(q)
      );
    }
    if (sortCol) {
      result.sort((a, b) => {
        const va = (a[sortCol] || '').toString().toLowerCase();
        const vb = (b[sortCol] || '').toString().toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    setFilteredRows(result);
  }, [rows, searchQuery, categoryFilter, sortCol, sortDir]);

  const handleSort = (colKey) => {
    if (sortCol === colKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // SPREADSHEET CELL EDITING
  // ───────────────────────────────────────────────────────────────────────────
  const handleStartEdit = (row, col) => {
    if (col.readOnly || col.fixed) return;
    setEditingCell({ rowId: row.id, colKey: col.key });
    setEditValue(row[col.key] || '');
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 20);
  };

  const handleCellChange = (rowId, colKey, value) => {
    setEditValue(value);
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, [colKey]: value, _isDirty: true };
    }));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { rowId, colKey } = editingCell;
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, [colKey]: editValue, _isDirty: true };
    }));
    setEditingCell(null);
  };

  const handleKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      const editableCols = COLUMNS.filter(c => !c.readOnly && !c.fixed);
      const currColPos = editableCols.findIndex(c => c.key === COLUMNS[colIdx].key);
      const nextCol = editableCols[currColPos + (e.shiftKey ? -1 : 1)];
      if (nextCol) {
        const targetRow = filteredRows[rowIdx];
        if (targetRow) {
          setEditingCell({ rowId: targetRow.id, colKey: nextCol.key });
          setEditValue(targetRow[nextCol.key] || '');
        }
      }
    }
  };

  // ── Row Save ──
  const handleSaveRow = async (row) => {
    setSavingRowId(row.id);
    try {
      const payload = {
        company_name: row.name,
        primary_contact_name: row.contactName || null,
        primary_phone: row.phone || null,
        primary_email: row.email || null,
        billing_address: row.billingAddress || 'Address not provided',
        city: row.city || null,
        state: row.state || 'Maharashtra',
        gstin: row.gstin || null,
        payment_terms: row.creditTerms || '30 Days Net',
        industry_segment: row.industry || row.tier || 'Precision Machining',
      };

      if (row.dbId) {
        await customerService.update(row.dbId, payload);
        if (onNotify) onNotify(`Saved changes for ${row.name}`);
      } else {
        const res = await customerService.create(payload);
        const newDbId = res?.data?.[0]?.id || res?.data?.id;
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, dbId: newDbId, source: 'Database', _isNew: false, _isDirty: false } : r));
        if (onNotify) onNotify(`Client "${row.name}" saved to database.`);
      }

      setRows(prev => prev.map(r => r.id === row.id ? { ...r, _isDirty: false, _isNew: false } : r));
    } catch (err) {
      console.error('Error saving row:', err);
      if (onNotify) onNotify(`Error saving: ${err.message || 'Database error'}`);
    } finally {
      setSavingRowId(null);
    }
  };

  // ── Row Delete ──
  const handleDeleteRow = (row) => {
    setClientToDelete(row);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeletingClient(true);
    setDeletingRowId(clientToDelete.id);
    try {
      if (clientToDelete.dbId) {
        await customerService.delete(clientToDelete.dbId);
      }
      setRows(prev => prev.filter(r => r.id !== clientToDelete.id));
      if (onNotify) onNotify(`Deleted client "${clientToDelete.name}"`);
      setClientToDelete(null);
    } catch (err) {
      console.error('Error deleting client:', err);
      if (onNotify) onNotify(`Failed to delete: ${err.message || 'Database error'}`, 'danger');
    } finally {
      setIsDeletingClient(false);
      setDeletingRowId(null);
    }
  };

  // ── Add New Client Row ──
  const handleAddRow = () => {
    const newId = `new-${Date.now()}`;
    const newRow = {
      ...EMPTY_ROW,
      id: newId,
      name: 'New Client Company',
      _isNew: true,
      _isDirty: true
    };
    setRows(prev => [newRow, ...prev]);
    setEditingCell({ rowId: newId, colKey: 'name' });
    setEditValue('New Client Company');
  };

  // ── CSV Export ──
  const handleExportCsv = () => {
    const exportCols = COLUMNS.filter(c => c.key !== 'idx');
    const headerRow = exportCols.map(c => `"${c.label}"`).join(',');
    const dataRows = filteredRows.map(r =>
      exportCols.map(c => `"${(r[c.key] || '').toString().replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...dataRows].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `GPS_Client_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onNotify) onNotify('Downloaded Client Directory CSV export.');
  };

  // ── PDF Export ──
  const handleExportPdf = () => {
    const pdfData = filteredRows.map(r => ({
      companyName: r.name,
      category: r.category || 'Customer',
      tier: r.industry || r.tier || 'Enterprise Account',
      location: r.billingAddress || `${r.city}, ${r.state}`,
      primaryContact: {
        name: r.contactName,
        designation: r.designation,
        email: r.email,
        phone: r.phone
      },
      ccList: r.ccList || []
    }));
    exportContactsDirectoryPdf(pdfData);
    if (onNotify) onNotify('Exported Client Directory PDF successfully.');
  };

  // ── Modal Form Handlers ──
  const handleOpenAddContact = () => {
    setEditingContact(null);
    setContactForm({
      companyName: '',
      category: 'Customer',
      tier: 'Tier 1 - Industrial Client',
      location: '',
      gstin: '',
      primaryName: '',
      primaryRole: 'DGM - Procurement',
      primaryDept: 'Procurement',
      primaryEmail: '',
      primaryPhone: '',
      ccEmailsText: '',
      notes: ''
    });
    setIsContactModalOpen(true);
  };

  const handleSaveContact = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (contactForm.category === 'Customer' && !canMutateCustomer) {
      if (onNotify) onNotify('Permission Denied: Your role does not have authorization to modify Customer contacts.');
      return;
    }
    if (contactForm.category === 'Supplier' && !canMutateSupplier) {
      if (onNotify) onNotify('Permission Denied: Your role does not have authorization to modify Supplier contacts.');
      return;
    }

    setIsSavingContact(true);
    try {
      const res = await contactService.saveUnifiedContact(contactForm, editingContact);
      if (res.error) {
        if (onNotify) onNotify(`Error saving contact: ${res.error}`);
        setIsSavingContact(false);
        return;
      }

      setIsContactModalOpen(false);
      setIsSavingContact(false);
      if (onNotify) {
        onNotify(editingContact ? `Updated contact details for ${contactForm.companyName}` : `Added new client: ${contactForm.companyName}`);
      }
      await loadLedgerData();
    } catch (err) {
      setIsSavingContact(false);
      if (onNotify) onNotify(`Database operation error: ${err.message || 'Failed to save contact'}`);
    }
  };

  if (isLedgerLoading) {
    return (
      <TablePageSkeleton 
        hasMetrics={true} 
        metricCount={4} 
        columns={['44px', '220px', '110px', '160px', '170px', '140px', '210px', '125px']} 
        rows={8} 
      />
    );
  }

  return (
    <div className="content-area">
      {/* ── Top Header Bar ── */}
      <PageHeader
        title="Client Directory"
        subtitle="Unified Master Client Accounts Ledger, Engineering Contacts & Systematic Email CC Registry"
        badge={`${rows.length} Registered Accounts`}
      >
        <button type="button" className="btn btn-secondary" onClick={handleRefreshAll} title="Reload live data">
          <RefreshCw size={13} className={isLedgerLoading ? 'spin-icon' : ''} />
          <span className="desktop-only-inline">Refresh</span>
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleExportCsv} title="Download CSV ledger">
          <Download size={14} />
          <span className="desktop-only-inline">Export CSV</span>
          <span className="mobile-only-inline">CSV</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExportPdf}
          title="Download formal contacts directory PDF"
        >
          <Download size={14} />
          <span className="desktop-only-inline">Export PDF</span>
          <span className="mobile-only-inline">PDF</span>
        </button>
        {canAddAny && (
          <button type="button" className="btn btn-primary" onClick={handleAddRow} title="Add new client row to Excel grid">
            <Plus size={14} />
            <span className="desktop-only-inline">Add Client</span>
            <span className="mobile-only-inline">Add</span>
          </button>
        )}
      </PageHeader>

      <div className="content-body">

        {/* ── KPI Summary Strip (Standard GPS ERP metrics-grid) ── */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Accounts</span>
              <div className="metric-icon-wrap" style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>
                <Users size={15} />
              </div>
            </div>
            <div className="metric-value">{stats.total}</div>
            <div className="metric-footer" style={{ color: 'var(--primary)' }}>
              Master Ledger Accounts
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Direct Email Configured</span>
              <div className="metric-icon-wrap" style={{ color: '#0284c7', background: '#e0f2fe' }}>
                <Mail size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#0284c7' }}>{stats.withEmail}</div>
            <div className="metric-footer" style={{ color: '#0284c7' }}>
              Direct Outlook Dispatch Ready
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">GSTIN Registered</span>
              <div className="metric-icon-wrap" style={{ color: '#059669', background: '#d1fae5' }}>
                <Hash size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#059669' }}>{stats.withGstin}</div>
            <div className="metric-footer" style={{ color: '#059669' }}>
              Tax Compliance Verified
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Commercial Volume</span>
              <div className="metric-icon-wrap" style={{ color: '#d97706', background: '#fef3c7' }}>
                <CreditCard size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>{stats.totalBiz}</div>
            <div className="metric-footer" style={{ color: '#d97706' }}>
              Quoted & Invoiced Business
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            UNIFIED EXCEL SPREADSHEET VIEW
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="section-card" style={{ padding: '0', overflow: 'hidden' }}>

          {/* Excel Toolbar */}
          <div className="filter-bar" style={{ borderBottom: '2px solid var(--border-color)' }}>
            <div className="filter-group">
              <div className="search-input-wrap">
                <Search size={13} className="search-icon" />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search company, contact person, email, GSTIN, phone, city..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <CustomSelect
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Accounts' },
                  { value: 'Customer', label: 'Clients / Customers' },
                  { value: 'Supplier', label: 'Precision Vendors / Suppliers' }
                ]}
              />

              {(searchQuery || categoryFilter !== 'All') && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('All');
                  }}
                  style={{ height: '34px', whiteSpace: 'nowrap' }}
                >
                  <X size={12} />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <div className="filter-summary-count">
              Showing <strong>{filteredRows.length}</strong> of {rows.length} accounts • Click cell to edit
            </div>
          </div>

          {/* Editable Spreadsheet Table Container */}
          <div className="table-responsive" style={{
            overflowX: 'auto',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxHeight: 'calc(100vh - 310px)',
            position: 'relative',
            width: '100%'
          }}>
            {filteredRows.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No clients found</p>
                <p style={{ margin: '4px 0 14px', fontSize: '12px' }}>Click "+ Add Client" to create a new client or adjust filters.</p>
                {canAddAny && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAddRow}>
                    <Plus size={13} />
                    <span>Add First Client</span>
                  </button>
                )}
              </div>
            ) : (
              <table
                ref={tableRef}
                style={{
                  width: 'max-content',
                  minWidth: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  fontFamily: 'inherit'
                }}
              >
                {/* Header */}
                <thead>
                  <tr>
                    {COLUMNS.map((col) => {
                      const isIdx = col.key === 'idx';
                      const isName = col.key === 'name';
                      const isFixed = isIdx || isName;
                      const leftPos = isIdx ? 0 : isName ? 44 : undefined;
                      const stickyClass = isIdx ? 'excel-sticky-idx' : isName ? 'excel-sticky-name' : undefined;

                      return (
                        <th
                          key={col.key}
                          className={stickyClass}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            padding: '9px 12px',
                            background: 'var(--bg-surface-subtle)',
                            color: 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            textAlign: col.align || 'left',
                            whiteSpace: 'nowrap',
                            position: 'sticky',
                            top: 0,
                            zIndex: isFixed ? 15 : 10,
                            left: leftPos,
                            boxShadow: isName ? '2px 0 4px rgba(0,0,0,0.06)' : undefined,
                            borderRight: '1px solid var(--border-color)',
                            borderBottom: '2px solid var(--border-color)',
                            cursor: col.readOnly || isFixed ? 'default' : 'pointer',
                            userSelect: 'none',
                          }}
                          onClick={() => !isFixed && !col.readOnly && handleSort(col.key)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                            {col.icon && <col.icon size={12} style={{ color: 'var(--text-muted)' }} />}
                            <span>{col.label}</span>
                            {sortCol === col.key && (
                              <ArrowUpDown size={11} style={{ color: 'var(--primary)', transform: sortDir === 'desc' ? 'scaleY(-1)' : 'none' }} />
                            )}
                          </div>
                        </th>
                      );
                    })}
                    {/* Actions column */}
                    <th style={{
                      minWidth: 160,
                      padding: '9px 12px',
                      background: 'var(--bg-surface-subtle)',
                      color: 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      borderBottom: '2px solid var(--border-color)'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody>
                  {filteredRows.map((row, rowIdx) => {
                    const isSaving = savingRowId === row.id;
                    const isDeleting = deletingRowId === row.id;
                    const isNew = row._isNew;
                    const isDirty = row._isDirty;

                    const rowBg = isNew
                      ? '#fffbeb'
                      : isDirty
                        ? '#f0fdf4'
                        : rowIdx % 2 === 0
                          ? '#ffffff'
                          : '#fafafa';

                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: rowBg,
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background 0.1s'
                        }}
                      >
                        {COLUMNS.map((col, colIdx) => {
                          const isCellEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                          const val = row[col.key] ?? '';
                          const isIdx = col.key === 'idx';
                          const isName = col.key === 'name';
                          const isFixed = isIdx || isName;
                          const leftPos = isIdx ? 0 : isName ? 44 : undefined;
                          const stickyClass = isIdx ? 'excel-sticky-idx' : isName ? 'excel-sticky-name' : undefined;

                          return (
                            <td
                              key={col.key}
                              className={stickyClass}
                              style={{
                                width: col.width,
                                minWidth: col.width,
                                maxWidth: col.width,
                                padding: isCellEditing ? '2px 4px' : '7px 12px',
                                borderRight: '1px solid var(--border-color)',
                                textAlign: col.align || 'left',
                                verticalAlign: 'middle',
                                position: isFixed ? 'sticky' : undefined,
                                left: leftPos,
                                zIndex: isFixed ? 6 : undefined,
                                background: isFixed ? rowBg : undefined,
                                boxShadow: isName ? '2px 0 4px rgba(0,0,0,0.06)' : undefined,
                                cursor: col.readOnly || isFixed ? 'default' : 'cell',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: col.multiline ? 'normal' : 'nowrap',
                                fontSize: col.mono ? '11px' : '12px',
                                fontFamily: col.mono ? 'monospace' : 'inherit'
                              }}
                              onClick={() => !col.readOnly && !isFixed && handleStartEdit(row, col)}
                              title={!isCellEditing && val ? String(val) : undefined}
                            >
                              {isCellEditing ? (
                                <input
                                  ref={inputRef}
                                  type={col.type || 'text'}
                                  className="form-control mono"
                                  value={editValue}
                                  onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                  style={{
                                    height: '26px',
                                    padding: '2px 6px',
                                    fontSize: '11.5px',
                                    border: '2px solid var(--primary)',
                                    borderRadius: '3px',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              ) : col.key === 'idx' ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{rowIdx + 1}</span>
                              ) : col.key === 'name' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>{val || '—'}</strong>
                                </div>
                              ) : col.key === 'category' ? (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontWeight: 600,
                                  background: (val || 'Customer') === 'Supplier' ? '#eff6ff' : 'var(--primary-light)',
                                  color: (val || 'Customer') === 'Supplier' ? '#1d4ed8' : 'var(--primary)',
                                  display: 'inline-block'
                                }}>
                                  {val || 'Customer'}
                                </span>
                              ) : col.key === 'ccEmails' ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                  <span
                                    title={row.ccEmails || (row.ccList || []).map(c => c.email).join(', ') || 'No CC configured'}
                                    style={{
                                      fontSize: '11px',
                                      color: (row.ccList?.length > 0 || row.ccEmails) ? 'var(--text-main)' : 'var(--text-muted)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '150px'
                                    }}
                                  >
                                    {row.ccList?.length > 0
                                      ? `${row.ccList.length} CCs (${row.ccList.map(c => c.dept || c.label || 'CC').slice(0, 2).join(', ')}${row.ccList.length > 2 ? '...' : ''})`
                                      : (row.ccEmails || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>)}
                                  </span>
                                  {(row.ccList?.length > 0 || row.ccEmails) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const textToCopy = row.ccList?.length > 0
                                          ? row.ccList.map(c => c.email).join(', ')
                                          : row.ccEmails;
                                        navigator.clipboard.writeText(textToCopy);
                                        if (onNotify) onNotify(`Copied CC email addresses for ${row.name}`);
                                      }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
                                      title="Copy CC addresses to clipboard"
                                    >
                                      <Copy size={11} />
                                    </button>
                                  )}
                                </div>
                              ) : col.key === 'quotesCount' ? (
                                row.quotesCount > 0 ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleOpenQuotesModal(row); }}
                                    className="btn btn-secondary btn-xs"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      background: '#eff6ff',
                                      borderColor: '#bfdbfe',
                                      color: '#1e40af',
                                      fontWeight: 600,
                                      borderRadius: '4px'
                                    }}
                                    title="Click to view quotation history for this client"
                                  >
                                    <FileText size={11} color="#2563eb" />
                                    <span>{row.quotesCount} {row.quotesCount === 1 ? 'Quote' : 'Quotes'}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleCreateQuoteForClient(row); }}
                                    className="btn btn-secondary btn-xs"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 6px',
                                      fontSize: '10.5px',
                                      color: 'var(--text-muted)'
                                    }}
                                    title="Draft new quotation in Sales for this client"
                                  >
                                    <Plus size={10} />
                                    <span>+ Quote</span>
                                  </button>
                                )
                              ) : col.key === 'totalBusiness' ? (
                                <strong style={{ color: '#7A1F3D' }}>{val}</strong>
                              ) : col.key === 'outstanding' ? (
                                <span style={{ color: val !== '₹0' ? '#dc2626' : 'var(--text-muted)', fontWeight: val !== '₹0' ? 600 : 400 }}>
                                  {val}
                                </span>
                              ) : (
                                val || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>—</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Actions Column */}
                        <td style={{
                          padding: '4px 8px',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid var(--border-color)',
                          background: rowBg
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            {/* Send Email via Outlook Composer */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              title="Compose email to this client with pre-stored CCs"
                              onClick={() => handleSendEmailForRow(row)}
                              style={{ padding: '3px 7px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#0284c7' }}
                            >
                              <Send size={11} />
                              <span>Email</span>
                            </button>

                            {/* Draft Quotation in Sales */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              title="Draft new Quotation for this client in Sales & Quotes"
                              onClick={() => handleCreateQuoteForClient(row)}
                              style={{ padding: '3px 7px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#7A1F3D' }}
                            >
                              <Plus size={10} />
                              <span>Quote</span>
                            </button>

                            {/* Save Row if modified */}
                            {row._isDirty && (
                              <button
                                type="button"
                                className="btn btn-primary btn-xs"
                                onClick={() => handleSaveRow(row)}
                                disabled={isSaving}
                                title="Save changes to database"
                                style={{ padding: '3px 7px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Save size={11} />
                                <span>{isSaving ? '...' : 'Save'}</span>
                              </button>
                            )}

                            {/* Delete Row */}
                            {canAddAny && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                onClick={() => handleDeleteRow(row)}
                                disabled={isDeleting}
                                title="Delete client record"
                                style={{ padding: '3px 6px', color: '#dc2626' }}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer Summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-surface-subtle)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span><strong style={{ color: 'var(--text-main)' }}>{filteredRows.length}</strong> of {rows.length} clients shown</span>
            <span className="desktop-only-inline">•</span>
            <span className="desktop-only-inline">Click any cell to edit • Tab to move • Enter to confirm • Esc to cancel</span>
            <span className="desktop-only-inline">•</span>
            <span style={{ color: '#16a34a' }}>
              <Save size={10} style={{ display: 'inline', marginRight: '3px' }} />
              Unsaved rows show in yellow/green — click Save to persist
            </span>
          </div>
        </div>

      </div>

      {/* ── MODAL 1: ADD / EDIT CLIENT MODAL ── */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={editingContact ? `Edit Account: ${editingContact.companyName}` : 'Add Client Account & Contact'}
        subtitle="Configure company details, primary contact person and systematic department CC emails"
        maxWidth="650px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsContactModalOpen(false)}
              disabled={isSavingContact}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveContact}
              disabled={isSavingContact}
            >
              {isSavingContact ? <RefreshCw size={13} className="spin-icon" /> : <Check size={13} />}
              <span>{isSavingContact ? 'Saving...' : (editingContact ? 'Save Changes' : 'Add to Directory')}</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveContact}>
          <div className="form-grid">
            {/* Company Name */}
            <div className="form-group full-width">
              <label className="form-label">Company / Account Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={contactForm.companyName}
                onChange={(e) => setContactForm(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="e.g. Tata Motors Ltd / Bharat Forge / Siemens"
              />
            </div>

            {/* Category & Tier */}
            <div className="form-group">
              <label className="form-label">Category</label>
              <CustomSelect
                value={contactForm.category}
                onChange={(e) => setContactForm(prev => ({ ...prev, category: e.target.value }))}
                options={[
                  { value: 'Customer', label: 'Customer / Client' },
                  { value: 'Supplier', label: 'Supplier / Vendor' },
                  { value: 'Partner', label: 'Technical Partner' }
                ]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Client Tier / Industry</label>
              <input
                type="text"
                className="form-control"
                value={contactForm.tier}
                onChange={(e) => setContactForm(prev => ({ ...prev, tier: e.target.value }))}
                placeholder="e.g. Tier 1 - Automotive Machining"
              />
            </div>

            {/* Location & GSTIN */}
            <div className="form-group">
              <label className="form-label">Plant Location / City</label>
              <input
                type="text"
                className="form-control"
                value={contactForm.location}
                onChange={(e) => setContactForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. Chakan Phase II, Pune"
              />
            </div>

            <div className="form-group">
              <label className="form-label">GSTIN / Tax ID</label>
              <input
                type="text"
                className="form-control mono"
                value={contactForm.gstin}
                onChange={(e) => setContactForm(prev => ({ ...prev, gstin: e.target.value }))}
                placeholder="27AABCT2934K1Z4"
              />
            </div>

            {/* Divider */}
            <div className="form-group full-width" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
              <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>Primary Recipient (TO Field)</strong>
            </div>

            {/* Primary Contact Details */}
            <div className="form-group">
              <label className="form-label">Contact Person Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={contactForm.primaryName}
                onChange={(e) => setContactForm(prev => ({ ...prev, primaryName: e.target.value }))}
                placeholder="e.g. Tanmay Sharma"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Designation / Role</label>
              <input
                type="text"
                className="form-control"
                value={contactForm.primaryRole}
                onChange={(e) => setContactForm(prev => ({ ...prev, primaryRole: e.target.value }))}
                placeholder="e.g. DGM - Procurement"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Primary Direct Email (TO) *</label>
              <input
                type="email"
                className="form-control mono"
                required
                value={contactForm.primaryEmail}
                onChange={(e) => setContactForm(prev => ({ ...prev, primaryEmail: e.target.value }))}
                placeholder="tanmay@company.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Direct Phone / Mobile</label>
              <input
                type="text"
                className="form-control mono"
                value={contactForm.primaryPhone}
                onChange={(e) => setContactForm(prev => ({ ...prev, primaryPhone: e.target.value }))}
                placeholder="+91 98230 12345"
              />
            </div>

            {/* Divider */}
            <div className="form-group full-width" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
              <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>Systematic Pre-Stored CC Emails</strong>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Enter all email addresses that must be CC'd on communications (separated by commas).
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">CC Email Addresses (Comma-Separated)</label>
              <textarea
                className="form-control mono"
                rows="3"
                value={contactForm.ccEmailsText}
                onChange={(e) => setContactForm(prev => ({ ...prev, ccEmailsText: e.target.value }))}
                placeholder="accounts.pune@company.com, plant.head@company.com, qc.inward@company.com, stores@company.com"
              />
            </div>

            {/* Notes */}
            <div className="form-group full-width">
              <label className="form-label">Special Invoicing &amp; Communication Instructions</label>
              <input
                type="text"
                className="form-control"
                value={contactForm.notes}
                onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Always copy plant head on quotes; E-Way bill must copy gate stores."
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: OUTLOOK-STYLE EMAIL COMPOSER ── */}
      {isComposerOpen && composerDocData && (
        <OutlookEmailComposer
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          documentData={composerDocData}
          documentType={composerDocType}
          onSent={() => {
            setIsComposerOpen(false);
            if (onNotify) {
              onNotify(`Email successfully transmitted to ${composerDocData.customer} with all pre-stored CCs.`);
            }
          }}
          onNotify={onNotify}
        />
      )}

      {/* ── MODAL 3: DOCUMENT PREVIEW MODAL ── */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />

      {/* ── MODAL 4: CLIENT SALES QUOTATIONS HISTORY MODAL ── */}
      <Modal
        isOpen={isQuotesModalOpen && Boolean(selectedClientForQuotes)}
        onClose={() => setIsQuotesModalOpen(false)}
        title={`Quotations History: ${selectedClientForQuotes?.name || selectedClientForQuotes?.companyName || 'Client'}`}
        subtitle="Connected sales quotations, commercial estimates and overhaul proposals"
        maxWidth="900px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsQuotesModalOpen(false)}
            >
              Close
            </button>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsQuotesModalOpen(false);
                  handleViewQuotesForClient(selectedClientForQuotes);
                }}
                title="Open Sales & Quotes screen filtered for this client"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <ExternalLink size={13} />
                <span className="desktop-only-inline">Open in Sales Desk</span>
                <span className="mobile-only-inline">Sales</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsQuotesModalOpen(false);
                  handleCreateQuoteForClient(selectedClientForQuotes);
                }}
                title="Create a new quotation for this client with auto-filled details"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Plus size={13} />
                <span>+ New Quotation</span>
              </button>
            </div>
          </div>
        }
      >
        {selectedClientForQuotes && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Client Summary Bar */}
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-surface-subtle)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', wordBreak: 'break-word' }}>
                  <Building2 size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span>{selectedClientForQuotes.name || selectedClientForQuotes.companyName}</span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px', wordBreak: 'break-word' }}>
                  {selectedClientForQuotes.billingAddress || selectedClientForQuotes.location || 'Location not specified'}
                  {selectedClientForQuotes.gstin && ` • GSTIN: ${selectedClientForQuotes.gstin}`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Quotations</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e40af' }}>
                    {(selectedClientForQuotes.quotes || []).length}
                  </div>
                </div>
                <div style={{ height: '28px', width: '1px', background: 'var(--border-color)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quoted Volume</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#7A1F3D' }}>
                    {formatCurrency(
                      (selectedClientForQuotes.quotes || []).reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0)
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quotations List */}
            {(selectedClientForQuotes.quotes || []).length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)'
              }}>
                <FileText size={32} style={{ color: 'var(--text-muted)', opacity: 0.5, margin: '0 auto 10px' }} />
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-main)' }}>No Sales Quotations Found</h4>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  There are no recorded estimates or quotations for this client yet.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setIsQuotesModalOpen(false);
                    handleCreateQuoteForClient(selectedClientForQuotes);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                >
                  <Plus size={13} />
                  <span>Create First Quotation in Sales Desk</span>
                </button>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                <table className="table" style={{ margin: 0, width: '100%', minWidth: '640px', fontSize: '12px' }}>
                  <thead style={{ background: 'var(--bg-surface-subtle)' }}>
                    <tr>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Estimate #</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Spindle Serial</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>Scope of Work</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Amount</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedClientForQuotes.quotes || []).map((q, idx) => (
                      <tr key={q.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FileText size={12} color="var(--primary)" />
                            <span className="mono">{q.estimateNo}</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                          {q.date}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span className="mono" style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '3px', fontSize: '11px' }}>
                            {q.spindleSerial}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.scopeOfWork}>
                          {q.scopeOfWork}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#7A1F3D' }}>
                          {formatCurrency(q.totalAmount)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '10.5px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            background: q.status === 'Approved' ? '#dcfce7' : q.status === 'Draft' ? '#f1f5f9' : '#fef3c7',
                            color: q.status === 'Approved' ? '#166534' : q.status === 'Draft' ? '#475569' : '#92400e'
                          }}>
                            {q.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => {
                              setIsQuotesModalOpen(false);
                              handleViewQuotesForClient(selectedClientForQuotes);
                            }}
                            title="View in Sales Desk"
                            style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            <ExternalLink size={11} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── MODAL 4: CONFIRM CLIENT DELETION ── */}
      {clientToDelete && (
        <Modal
          isOpen={Boolean(clientToDelete)}
          onClose={() => !isDeletingClient && setClientToDelete(null)}
          title="Delete Client Account"
          maxWidth="480px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setClientToDelete(null)}
                disabled={isDeletingClient}
                style={{ minWidth: '85px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmDelete}
                disabled={isDeletingClient}
                style={{
                  background: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  boxShadow: '0 1px 3px rgba(220, 38, 38, 0.25)'
                }}
              >
                <Trash2 size={14} className={isDeletingClient ? 'spin-icon' : ''} />
                <span>{isDeletingClient ? 'Deleting Client...' : 'Delete Client'}</span>
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '4px 0', flexWrap: 'wrap' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#dc2626',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.12)'
            }}>
              <AlertCircle size={24} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                Are you sure you want to delete this client?
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 14px' }}>
                This will permanently delete the client account and remove all linked ledger details from the Master Directory.
              </p>

              {/* Client Info Highlight Card */}
              <div style={{
                background: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Building2 size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                    {clientToDelete.name || 'Unnamed Client'}
                  </span>
                  {clientToDelete.category && (
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(122, 31, 61, 0.08)',
                      color: 'var(--primary)',
                      marginLeft: 'auto'
                    }}>
                      {clientToDelete.category}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {clientToDelete.contactName && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Contact: </span>
                      <strong style={{ color: 'var(--text-main)' }}>{clientToDelete.contactName}</strong>
                    </div>
                  )}
                  {clientToDelete.phone && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Phone: </span>
                      <strong style={{ color: 'var(--text-main)' }}>{clientToDelete.phone}</strong>
                    </div>
                  )}
                  {clientToDelete.email && (
                    <div style={{ gridColumn: '1 / -1', wordBreak: 'break-all' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Email: </span>
                      <strong style={{ color: 'var(--text-main)' }}>{clientToDelete.email}</strong>
                    </div>
                  )}
                  {clientToDelete.gstin && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>GSTIN: </span>
                      <strong className="mono" style={{ color: 'var(--text-main)' }}>{clientToDelete.gstin}</strong>
                    </div>
                  )}
                  {clientToDelete.city && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>City: </span>
                      <strong style={{ color: 'var(--text-main)' }}>{clientToDelete.city}</strong>
                    </div>
                  )}
                  {clientToDelete.totalBusiness && clientToDelete.totalBusiness !== '₹0' && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Biz: </span>
                      <strong style={{ color: '#7A1F3D' }}>{clientToDelete.totalBusiness}</strong>
                    </div>
                  )}
                  {clientToDelete.outstanding && clientToDelete.outstanding !== '₹0' && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Outstanding: </span>
                      <strong style={{ color: '#dc2626' }}>{clientToDelete.outstanding}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                color: '#dc2626',
                fontWeight: 500
              }}>
                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                <span>This action cannot be undone.</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
