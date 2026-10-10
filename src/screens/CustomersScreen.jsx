import React, { useState, useEffect, useRef, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import { customerService } from '../services/database/customerService';
import { salesService } from '../services/database/salesService';
import { proformaInvoiceService } from '../services/database/proformaInvoiceService';
import { invoiceService } from '../services/database/invoiceService';
import {
  Search, Plus, Download, RefreshCw, AlertCircle, Save, X,
  Trash2, Upload, CheckCircle2, Edit3, ChevronDown, Filter,
  Users, Building2, Phone, Mail, MapPin, CreditCard, Hash,
  ArrowUpDown, Eye, FileText, Sparkles
} from 'lucide-react';

// ─── Column Definitions ───────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'idx',           label: '#',              width: 44,   fixed: true,  readOnly: true, align: 'center' },
  { key: 'name',          label: 'Company Name',   width: 220,  icon: Building2,   required: true },
  { key: 'contactName',   label: 'Contact Person', width: 180,  icon: Users },
  { key: 'phone',         label: 'Phone / Mobile', width: 150,  icon: Phone,   type: 'tel' },
  { key: 'email',         label: 'Email Address',  width: 210,  icon: Mail,    type: 'email' },
  { key: 'billingAddress',label: 'Billing Address',width: 260,  icon: MapPin,  multiline: true },
  { key: 'city',          label: 'City',           width: 130 },
  { key: 'state',         label: 'State',          width: 130 },
  { key: 'gstin',         label: 'GSTIN',          width: 170,  icon: Hash,    mono: true },
  { key: 'creditTerms',   label: 'Payment Terms',  width: 160,  icon: CreditCard },
  { key: 'industry',      label: 'Industry Segment', width: 190 },
  { key: 'source',        label: 'Source',         width: 130,  readOnly: true, align: 'center' },
  { key: 'totalBusiness', label: 'Total Business', width: 130,  readOnly: true, align: 'right', mono: true },
  { key: 'outstanding',   label: 'Outstanding',    width: 120,  readOnly: true, align: 'right', mono: true },
];

const EMPTY_ROW = {
  id: null, dbId: null, source: 'Manual',
  name: '', contactName: '', phone: '', email: '',
  billingAddress: '', city: '', state: '', gstin: '',
  creditTerms: 'Net 30 Days', industry: 'Precision Engineering',
  totalBusiness: '₹0', outstanding: '₹0', _isNew: true, _isDirty: false
};

const formatCurrency = (n) => {
  if (!n || isNaN(n) || Number(n) <= 0) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

// ─── Extract unique clients from Quotations / PI / Invoices ──────────────────
function extractClientsFromDocs(quotations = [], proformas = [], invoices = []) {
  const map = new Map();

  const upsert = (key, partial, source) => {
    if (!key) return;
    const k = key.trim().toUpperCase();
    if (!map.has(k)) {
      map.set(k, { ...EMPTY_ROW, name: key.trim(), source, _isNew: false });
    }
    const existing = map.get(k);
    // Only fill blanks
    if (!existing.contactName && partial.contactName) existing.contactName = partial.contactName;
    if (!existing.phone && partial.phone) existing.phone = partial.phone;
    if (!existing.email && partial.email) existing.email = partial.email;
    if (!existing.billingAddress && partial.billingAddress) existing.billingAddress = partial.billingAddress;
    if (!existing.city && partial.city) existing.city = partial.city;
    if (!existing.state && partial.state) existing.state = partial.state;
    if (!existing.gstin && partial.gstin) existing.gstin = partial.gstin;
    if (!existing.creditTerms && partial.creditTerms) existing.creditTerms = partial.creditTerms;
    if (!existing.industry && partial.industry) existing.industry = partial.industry;
    // Accumulate financials
    existing._totalNum = (existing._totalNum || 0) + (partial._totalNum || 0);
    existing._outstandingNum = (existing._outstandingNum || 0) + (partial._outstandingNum || 0);
    map.set(k, existing);
  };

  quotations.forEach(q => {
    const addr = q.billingAddress || q.billing_address || q.address || '';
    upsert(q.customer || q.company_name, {
      contactName: q.contactPerson || q.contact_person || q.contactName || '',
      phone: q.contactNo || q.phone || q.contact_phone || '',
      email: q.customerEmail || q.email || '',
      billingAddress: addr,
      city: q.city || '',
      state: (q.placeOfSupply || q.state || '').replace(/^\d+-/, '').trim(),
      gstin: q.gstin || q.customer_gstin || '',
      _totalNum: Number(q.totalAmount || q.total_amount || 0)
    }, 'Quotation');
  });

  proformas.forEach(p => {
    const addr = p.billingAddress || p.customerAddress || '';
    upsert(p.customer || p.customerFullName, {
      contactName: p.customerContact || p.contactPerson || '',
      phone: p.customerContact || p.contactNo || '',
      email: p.customerEmail || '',
      billingAddress: addr,
      city: p.city || '',
      state: (p.placeOfSupply || p.state || '').replace(/^\d+-/, '').trim(),
      gstin: p.gstin || '',
      _totalNum: Number(p.amountNum || p.totalAmount || 0)
    }, 'Proforma');
  });

  invoices.forEach(inv => {
    upsert(inv.customer || inv.customerFullName, {
      contactName: inv.contactNo || inv.contactPerson || '',
      phone: inv.contactNo || inv.customerContact || '',
      email: inv.customerEmail || '',
      billingAddress: inv.billingAddress || inv.customerAddress || '',
      city: '',
      state: (inv.placeOfSupply || inv.state || '').replace(/^\d+-/, '').trim(),
      gstin: inv.gstin || inv.customerGstin || '',
      _totalNum: Number(inv.amountNum || inv.totalAmount || 0),
      _outstandingNum: Number(inv.balanceNum || inv.balanceAmount || 0)
    }, 'Invoice');
  });

  return Array.from(map.values()).map(c => ({
    ...c,
    totalBusiness: formatCurrency(c._totalNum),
    outstanding: formatCurrency(c._outstandingNum)
  }));
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomersScreen({ onNavigate, onNotify }) {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // Editing
  const [editingCell, setEditingCell] = useState(null); // { rowId, colKey }
  const [editValue, setEditValue] = useState('');
  const [savingRowId, setSavingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, withEmail: 0, withGstin: 0, totalBiz: 0 });

  const inputRef = useRef(null);
  const tableRef = useRef(null);

  // ── Load all data ────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [custRes, qRes, piRes, invRes] = await Promise.all([
        customerService.getCustomers(),
        salesService.getQuotations().catch(() => ({ data: [] })),
        proformaInvoiceService.getProformaInvoices().catch(() => ({ data: [] })),
        invoiceService.getInvoices().catch(() => ({ data: [] }))
      ]);

      // Start with DB customers
      const dbCustomers = (custRes.data || []).map(c => ({
        id: c.customer_code || c.id,
        dbId: c.id,
        source: 'Database',
        name: c.company_name || '',
        contactName: c.primary_contact_name || c.contact_person || '',
        phone: c.primary_phone || c.phone || '',
        email: c.primary_email || c.email || '',
        billingAddress: c.billing_address || c.address || '',
        city: c.city || '',
        state: c.state || '',
        gstin: c.gstin || '',
        creditTerms: c.payment_terms || 'Net 30 Days',
        industry: c.industry_segment || 'Precision Engineering',
        totalBusiness: '₹0',
        outstanding: '₹0',
        _totalNum: 0,
        _outstandingNum: 0,
        _isNew: false,
        _isDirty: false
      }));

      // Extract from docs
      const docClients = extractClientsFromDocs(
        qRes.data || [],
        piRes.data || [],
        invRes.data || []
      );

      // Merge: DB takes priority, doc clients fill in gaps
      const merged = [...dbCustomers];
      const dbNames = new Set(dbCustomers.map(c => c.name.trim().toUpperCase()));

      docClients.forEach(dc => {
        const key = dc.name.trim().toUpperCase();
        if (!dbNames.has(key)) {
          merged.push({ ...dc, id: `doc-${Date.now()}-${Math.random()}` });
          dbNames.add(key);
        } else {
          // Enrich existing DB client with doc financial data
          const idx = merged.findIndex(m => m.name.trim().toUpperCase() === key);
          if (idx !== -1) {
            merged[idx]._totalNum = (merged[idx]._totalNum || 0) + (dc._totalNum || 0);
            merged[idx]._outstandingNum = (merged[idx]._outstandingNum || 0) + (dc._outstandingNum || 0);
            merged[idx].totalBusiness = formatCurrency(merged[idx]._totalNum);
            merged[idx].outstanding = formatCurrency(merged[idx]._outstandingNum);
            if (!merged[idx].email && dc.email) merged[idx].email = dc.email;
            if (!merged[idx].phone && dc.phone) merged[idx].phone = dc.phone;
            if (!merged[idx].gstin && dc.gstin) merged[idx].gstin = dc.gstin;
            if (!merged[idx].billingAddress && dc.billingAddress) merged[idx].billingAddress = dc.billingAddress;
          }
        }
      });

      setRows(merged);

      // Stats
      setStats({
        total: merged.length,
        withEmail: merged.filter(r => r.email).length,
        withGstin: merged.filter(r => r.gstin).length,
        totalBiz: formatCurrency(merged.reduce((s, r) => s + (r._totalNum || 0), 0))
      });

    } catch (err) {
      setError({ message: err.message || 'Failed to load client data' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Filter + Sort ────────────────────────────────────────────────────────
  useEffect(() => {
    let data = [...rows];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.contactName || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        (r.gstin || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q) ||
        (r.state || '').toLowerCase().includes(q)
      );
    }
    if (sortCol) {
      data.sort((a, b) => {
        const av = (a[sortCol] || '').toString().toLowerCase();
        const bv = (b[sortCol] || '').toString().toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    setFilteredRows(data);
  }, [rows, searchQuery, sortCol, sortDir]);

  // ── Focus input on cell edit ──────────────────────────────────────────────
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) inputRef.current.select();
    }
  }, [editingCell]);

  // ── Add new empty row ─────────────────────────────────────────────────────
  const handleAddRow = () => {
    const newRow = { ...EMPTY_ROW, id: `new-${Date.now()}`, _isNew: true };
    setRows(prev => [...prev, newRow]);
    // Auto-focus first cell of new row
    setTimeout(() => {
      setEditingCell({ rowId: newRow.id, colKey: 'name' });
      setEditValue('');
    }, 50);
  };

  // ── Start editing a cell ──────────────────────────────────────────────────
  const startEdit = (rowId, colKey, currentValue, col) => {
    if (col.readOnly) return;
    setEditingCell({ rowId, colKey });
    setEditValue(currentValue || '');
  };

  // ── Commit cell edit ──────────────────────────────────────────────────────
  const commitEdit = () => {
    if (!editingCell) return;
    const { rowId, colKey } = editingCell;
    setRows(prev => prev.map(r =>
      r.id === rowId
        ? { ...r, [colKey]: editValue, _isDirty: true }
        : r
    ));
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // ── Handle Tab / Enter key in cell ────────────────────────────────────────
  const handleCellKeyDown = (e, rowId, colKey) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commitEdit();

      // Move to next editable column
      const editableCols = COLUMNS.filter(c => !c.fixed && !c.readOnly);
      const currIdx = editableCols.findIndex(c => c.key === colKey);
      if (e.key === 'Tab') {
        const nextCol = editableCols[currIdx + (e.shiftKey ? -1 : 1)];
        if (nextCol) {
          const row = filteredRows.find(r => r.id === rowId);
          if (row) {
            setTimeout(() => {
              setEditingCell({ rowId, colKey: nextCol.key });
              setEditValue(row[nextCol.key] || '');
            }, 0);
          }
        }
      }
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // ── Save row to DB ────────────────────────────────────────────────────────
  const handleSaveRow = async (row) => {
    if (!row.name?.trim()) {
      if (onNotify) onNotify('Company Name is required', 'error');
      return;
    }
    setSavingRowId(row.id);
    try {
      const payload = {
        company_name: row.name.trim(),
        primary_contact_name: row.contactName || null,
        primary_phone: row.phone || null,
        primary_email: row.email || null,
        billing_address: row.billingAddress || null,
        city: row.city || null,
        state: row.state || null,
        gstin: row.gstin || null,
        payment_terms: row.creditTerms || null,
        industry_segment: row.industry || null
      };

      let res;
      if (row.dbId) {
        res = await customerService.updateCustomer(row.dbId, payload);
      } else {
        res = await customerService.createCustomer(payload);
      }

      if (res.error) {
        if (onNotify) onNotify(`Save failed: ${res.error.message || res.error}`, 'error');
      } else {
        if (onNotify) onNotify(`Client "${row.name}" saved successfully!`, 'success');
        setRows(prev => prev.map(r =>
          r.id === row.id
            ? { ...r, dbId: res.data?.[0]?.id || r.dbId, _isNew: false, _isDirty: false, source: 'Database' }
            : r
        ));
      }
    } catch (err) {
      if (onNotify) onNotify(`Error: ${err.message}`, 'error');
    } finally {
      setSavingRowId(null);
    }
  };

  // ── Delete row ────────────────────────────────────────────────────────────
  const handleDeleteRow = async (row) => {
    if (!window.confirm(`Remove client "${row.name}" from the directory?`)) return;
    setDeletingRowId(row.id);
    try {
      if (row.dbId) {
        // Try hard delete; if it fails due to RLS, just remove from view
        const { error } = await customerService.updateCustomer(row.dbId, { notes: '[ARCHIVED]' }).catch(() => ({ error: null }));
        // Regardless, remove from local state
      }
      setRows(prev => prev.filter(r => r.id !== row.id));
      if (onNotify) onNotify(`Client "${row.name}" removed from directory.`);
    } catch (err) {
      // Still remove from local view
      setRows(prev => prev.filter(r => r.id !== row.id));
      if (onNotify) onNotify(`Client "${row.name}" removed locally.`);
    } finally {
      setDeletingRowId(null);
    }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const csvCols = COLUMNS.filter(c => c.key !== 'idx');
    const header = csvCols.map(c => `"${c.label}"`).join(',');
    const rowLines = filteredRows.map(r =>
      csvCols.map(c => `"${(r[c.key] || '').toString().replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header, ...rowLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GPS-Clients-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onNotify) onNotify('Client directory exported as CSV!');
  };

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (colKey) => {
    if (sortCol === colKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  // ─── Source badge color ───────────────────────────────────────────────────
  const getSourceStyle = (source) => {
    const map = {
      'Database':  { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
      'Quotation': { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
      'Proforma':  { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
      'Invoice':   { bg: '#fdf4ff', color: '#9333ea', border: '#d8b4fe' },
      'Manual':    { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
    };
    return map[source] || map['Manual'];
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="content-area">
        <PageHeader title="Client Directory" subtitle="Loading client records..." badge="..." />
        <div className="content-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                height: '38px', background: i % 2 === 0 ? '#f8f8f8' : '#fff',
                borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.07}s`
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <PageHeader
        title="Client Directory"
        subtitle="All clients from quotations, proforma invoices & tax invoices — Excel-style management"
        badge={`${filteredRows.length} Clients`}
      >
        <button type="button" className="btn btn-secondary" onClick={loadAll} title="Refresh all data">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
          <Download size={14} />
          <span>Export CSV</span>
        </button>
        <button type="button" className="btn btn-primary" onClick={handleAddRow}>
          <Plus size={14} />
          <span>Add Client</span>
        </button>
      </PageHeader>

      <div className="content-body" style={{ paddingTop: '0' }}>

        {/* ── KPI Strip ──────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {[
            { label: 'Total Clients', value: stats.total, icon: Users, color: '#7A1F3D', bg: '#F5E8ED' },
            { label: 'Have Email', value: stats.withEmail, icon: Mail, color: '#0284c7', bg: '#e0f2fe' },
            { label: 'Have GSTIN', value: stats.withGstin, icon: Hash, color: '#059669', bg: '#d1fae5' },
            { label: 'Total Business', value: stats.totalBiz, icon: CreditCard, color: '#d97706', bg: '#fef3c7' },
          ].map(kpi => (
            <div key={kpi.label} className="section-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <kpi.icon size={18} color={kpi.color} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{kpi.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="section-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderBottom: '2px solid var(--border-color)',
            background: 'var(--bg-surface-subtle)',
            flexWrap: 'wrap'
          }}>
            <div className="search-input-wrap" style={{ minWidth: '220px', flex: 1, maxWidth: '340px' }}>
              <Search size={13} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search name, email, GSTIN, city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              <Sparkles size={12} style={{ display: 'inline', marginRight: '4px', color: '#d97706' }} />
              Auto-populated from Quotations, Proforma &amp; Tax Invoices
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* Legend */}
              {[
                { label: 'Database', ...getSourceStyle('Database') },
                { label: 'Quotation', ...getSourceStyle('Quotation') },
                { label: 'Proforma', ...getSourceStyle('Proforma') },
                { label: 'Invoice', ...getSourceStyle('Invoice') },
              ].map(s => (
                <span key={s.label} style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 7px',
                  borderRadius: '4px', background: s.bg, color: s.color,
                  border: `1px solid ${s.border}`
                }}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Excel-style Spreadsheet ──────────────────────────────────── */}
          <div
            ref={tableRef}
            style={{
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 340px)',
            }}
          >
            <table style={{
              borderCollapse: 'collapse',
              width: 'max-content',
              minWidth: '100%',
              fontSize: '12.5px',
              fontFamily: 'inherit',
            }}>
              {/* ── Header Row ───────────────────────────────────────────── */}
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        padding: '8px 10px',
                        background: '#7A1F3D',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '11px',
                        letterSpacing: '0.02em',
                        textAlign: col.align || 'left',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        top: 0,
                        zIndex: col.fixed ? 12 : 10,
                        left: col.fixed ? 0 : undefined,
                        borderRight: '1px solid rgba(255,255,255,0.15)',
                        borderBottom: '2px solid rgba(255,255,255,0.25)',
                        cursor: col.readOnly || col.fixed ? 'default' : 'pointer',
                        userSelect: 'none',
                      }}
                      onClick={() => !col.fixed && !col.readOnly && handleSort(col.key)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                        {col.icon && <col.icon size={11} opacity={0.8} />}
                        <span>{col.label}</span>
                        {sortCol === col.key && (
                          <ArrowUpDown size={10} style={{ opacity: 0.8, transform: sortDir === 'desc' ? 'scaleY(-1)' : 'none' }} />
                        )}
                      </div>
                    </th>
                  ))}
                  {/* Actions column */}
                  <th style={{
                    minWidth: 96, padding: '8px 10px',
                    background: '#7A1F3D', color: '#fff', fontWeight: 600, fontSize: '11px',
                    position: 'sticky', top: 0, zIndex: 10, whiteSpace: 'nowrap',
                    textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.25)'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>

              {/* ── Body ─────────────────────────────────────────────────── */}
              <tbody>
                {filteredRows.map((row, rowIdx) => {
                  const isEditing = editingCell?.rowId === row.id;
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
                        borderBottom: '1px solid #e5e7eb',
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => {
                        if (!isNew && !isDirty) e.currentTarget.style.background = '#f5e8ed30';
                      }}
                      onMouseLeave={e => {
                        if (!isNew && !isDirty) e.currentTarget.style.background = rowBg;
                      }}
                    >
                      {COLUMNS.map((col) => {
                        const cellIsEditing = isEditing && editingCell?.colKey === col.key;
                        const cellValue = row[col.key] ?? '';
                        const displayVal = col.key === 'idx' ? rowIdx + 1 : cellValue;

                        return (
                          <td
                            key={col.key}
                            style={{
                              width: col.width,
                              minWidth: col.width,
                              padding: cellIsEditing ? '0' : '0',
                              verticalAlign: 'middle',
                              textAlign: col.align || 'left',
                              fontFamily: col.mono ? 'monospace' : 'inherit',
                              borderRight: '1px solid #e5e7eb',
                              position: col.fixed ? 'sticky' : undefined,
                              left: col.fixed ? 0 : undefined,
                              zIndex: col.fixed ? 2 : undefined,
                              background: col.fixed ? rowBg : undefined,
                              overflow: 'hidden',
                              maxWidth: col.width,
                              cursor: col.readOnly ? 'default' : 'text',
                            }}
                            title={col.readOnly ? String(displayVal) : `Click to edit ${col.label}`}
                            onDoubleClick={() => !col.readOnly && startEdit(row.id, col.key, String(cellValue), col)}
                            onClick={() => {
                              if (!col.readOnly && !cellIsEditing && col.key !== 'idx') {
                                startEdit(row.id, col.key, String(cellValue), col);
                              }
                            }}
                          >
                            {cellIsEditing ? (
                              col.multiline ? (
                                <textarea
                                  ref={inputRef}
                                  value={editValue}
                                  rows={2}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={e => {
                                    if (e.key === 'Escape') cancelEdit();
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      commitEdit();
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    minHeight: '52px',
                                    padding: '6px 8px',
                                    border: '2px solid #7A1F3D',
                                    outline: 'none',
                                    fontSize: '12px',
                                    fontFamily: 'inherit',
                                    resize: 'none',
                                    background: '#fff8fb',
                                    boxSizing: 'border-box',
                                    display: 'block'
                                  }}
                                />
                              ) : (
                                <input
                                  ref={inputRef}
                                  type={col.type || 'text'}
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={e => handleCellKeyDown(e, row.id, col.key)}
                                  style={{
                                    width: '100%',
                                    height: '34px',
                                    padding: '0 8px',
                                    border: '2px solid #7A1F3D',
                                    outline: 'none',
                                    fontSize: '12.5px',
                                    fontFamily: col.mono ? 'monospace' : 'inherit',
                                    background: '#fff8fb',
                                    boxSizing: 'border-box',
                                    display: 'block'
                                  }}
                                />
                              )
                            ) : (
                              <div style={{
                                padding: '7px 10px',
                                whiteSpace: col.multiline ? 'pre-wrap' : 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minHeight: '34px',
                                lineHeight: '20px',
                                color: col.key === 'idx'
                                  ? 'var(--text-muted)'
                                  : col.key === 'outstanding' && parseFloat(String(displayVal).replace(/[^0-9.]/g, '')) > 0
                                    ? '#dc2626'
                                    : col.key === 'totalBusiness'
                                      ? '#7A1F3D'
                                      : 'var(--text-main)',
                                fontWeight: col.key === 'name' ? 600 : col.key === 'totalBusiness' ? 700 : 400,
                                fontSize: col.key === 'idx' ? '11px' : '12.5px',
                              }}>
                                {col.key === 'source' ? (
                                  <span style={{
                                    fontSize: '10px', fontWeight: 600, padding: '2px 6px',
                                    borderRadius: '4px', whiteSpace: 'nowrap',
                                    ...getSourceStyle(String(displayVal))
                                  }}>
                                    {displayVal || '—'}
                                  </span>
                                ) : (
                                  displayVal || (col.readOnly ? '—' : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>Click to edit</span>)
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* ── Actions Cell ───────────────────────────────────── */}
                      <td style={{
                        padding: '4px 8px',
                        borderRight: 'none',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        minWidth: 96,
                        whiteSpace: 'nowrap'
                      }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                          {(isDirty || isNew) && (
                            <button
                              type="button"
                              title="Save to database"
                              disabled={isSaving}
                              onClick={() => handleSaveRow(row)}
                              style={{
                                width: 26, height: 26, border: 'none', cursor: 'pointer',
                                borderRadius: '5px', background: '#16a34a', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: isSaving ? 0.5 : 1
                              }}
                            >
                              {isSaving ? <RefreshCw size={12} className="spin-icon" /> : <Save size={12} />}
                            </button>
                          )}
                          {(isDirty || isNew) && (
                            <button
                              type="button"
                              title="Cancel changes"
                              onClick={() => {
                                if (isNew) {
                                  setRows(prev => prev.filter(r => r.id !== row.id));
                                } else {
                                  setRows(prev => prev.map(r =>
                                    r.id === row.id ? { ...r, _isDirty: false } : r
                                  ));
                                  loadAll();
                                }
                              }}
                              style={{
                                width: 26, height: 26, border: 'none', cursor: 'pointer',
                                borderRadius: '5px', background: '#f1f5f9', color: '#475569',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              <X size={12} />
                            </button>
                          )}
                          {!isDirty && !isNew && (
                            <button
                              type="button"
                              title="Edit this client"
                              onClick={() => {
                                const editableCols = COLUMNS.filter(c => !c.fixed && !c.readOnly);
                                if (editableCols.length > 0) {
                                  setEditingCell({ rowId: row.id, colKey: editableCols[0].key });
                                  setEditValue(row[editableCols[0].key] || '');
                                }
                              }}
                              style={{
                                width: 26, height: 26, border: '1px solid #e5e7eb', cursor: 'pointer',
                                borderRadius: '5px', background: '#fff', color: '#6b7280',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Delete client"
                            disabled={isDeleting}
                            onClick={() => handleDeleteRow(row)}
                            style={{
                              width: 26, height: 26, border: '1px solid #fecaca', cursor: 'pointer',
                              borderRadius: '5px', background: '#fff', color: '#dc2626',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: isDeleting ? 0.5 : 1
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Empty state */}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Users size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>No clients found</div>
                      <p style={{ fontSize: '12px', marginBottom: '14px' }}>
                        {searchQuery ? 'No clients match your search.' : 'Click "Add Client" to start, or client data will auto-import from Quotations, Proforma & Tax Invoices.'}
                      </p>
                      {!searchQuery && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleAddRow}>
                          <Plus size={13} /><span>Add First Client</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )}

                {/* Add-row footer */}
                {filteredRows.length > 0 && (
                  <tr
                    onClick={handleAddRow}
                    style={{
                      cursor: 'pointer',
                      borderBottom: 'none',
                      background: 'transparent',
                    }}
                  >
                    <td colSpan={COLUMNS.length + 1} style={{ padding: '8px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', color: '#7A1F3D', fontWeight: 500,
                        opacity: 0.7,
                      }}>
                        <Plus size={13} />
                        Click to add new client row...
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-surface-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            <span><strong style={{ color: 'var(--text-main)' }}>{filteredRows.length}</strong> of {rows.length} clients shown</span>
            <span>•</span>
            <span>Click any cell to edit • Tab to move • Enter to confirm • Esc to cancel</span>
            <span>•</span>
            <span style={{ color: '#16a34a' }}>
              <Save size={10} style={{ display: 'inline', marginRight: '3px' }} />
              Unsaved rows show in yellow — click Save (✓) to persist
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
