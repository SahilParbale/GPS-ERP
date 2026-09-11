import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import {
  INTERNAL_GPS_CCS,
  PRESET_EMAIL_GROUPS
} from '../data/contactsData';
import { contactService } from '../services/database/contactService';
import {
  Search, Users, Mail, Phone, Building2, Copy, Check,
  Plus, Edit3, Trash2, Send, Download, Tag, CheckCircle2,
  FileText, ShieldCheck, Truck, Wrench, X, Filter, ExternalLink,
  ChevronDown, Info, AtSign, Briefcase, RefreshCw, AlertCircle
} from 'lucide-react';

export default function ContactsScreen({ onNavigate, onNotify }) {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [copiedKey, setCopiedKey] = useState(null);

  const loadContacts = async () => {
    setIsLoading(true);
    setError(null);
    const res = await contactService.getUnifiedDirectory();
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    }
    setContacts(res.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // Email Composer State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDocData, setComposerDocData] = useState(null);
  const [composerDocType, setComposerDocType] = useState('quotation');

  // Add / Edit Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    companyName: '',
    category: 'Customer',
    tier: 'Tier 1 - Industrial Client',
    location: '',
    gstin: '',
    primaryName: '',
    primaryRole: '',
    primaryDept: 'Procurement',
    primaryEmail: '',
    primaryPhone: '',
    ccEmailsText: '',
    notes: ''
  });

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        c.companyName.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.primaryContact.name.toLowerCase().includes(q) ||
        c.primaryContact.email.toLowerCase().includes(q) ||
        c.primaryContact.designation.toLowerCase().includes(q) ||
        (c.secondaryContact && (c.secondaryContact.name.toLowerCase().includes(q) || c.secondaryContact.email.toLowerCase().includes(q))) ||
        c.ccList.some(cc => cc.email.toLowerCase().includes(q) || cc.label.toLowerCase().includes(q) || cc.dept.toLowerCase().includes(q))
      );

      const matchesCat = categoryFilter === 'All' || c.category === categoryFilter;

      const matchesDept = deptFilter === 'All' || 
        c.primaryContact.department.toLowerCase().includes(deptFilter.toLowerCase()) ||
        c.ccList.some(cc => cc.dept.toLowerCase().includes(deptFilter.toLowerCase()));

      return matchesSearch && matchesCat && matchesDept;
    });
  }, [contacts, searchQuery, categoryFilter, deptFilter]);

  // Statistics
  const totalCompanies = contacts.length;
  const totalCcCount = useMemo(() => {
    return contacts.reduce((acc, curr) => acc + curr.ccList.length, 0);
  }, [contacts]);

  // Copy to clipboard helper
  const copyToClipboard = (text, keyName, label = 'Email') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);

    if (onNotify) {
      onNotify(`Copied ${label}: ${text}`);
    }
  };

  // Copy all CCs for a company
  const handleCopyAllCcs = (contact) => {
    const allCcText = contact.ccList.map(c => c.email).join(', ');
    copyToClipboard(allCcText, `all-cc-${contact.id}`, `All CCs for ${contact.companyName}`);
  };

  // Copy TO + CCs
  const handleCopyAllRecipients = (contact) => {
    const all = [contact.primaryContact.email, ...contact.ccList.map(c => c.email)].join(', ');
    copyToClipboard(all, `all-both-${contact.id}`, `TO + CCs for ${contact.companyName}`);
  };

  // Open Compose Email with pre-filled TO and CCs
  const handleComposeForContact = (contact, docType = 'quotation') => {
    const ccListEmails = contact.ccList.map(c => c.email);
    setComposerDocType(docType);
    setComposerDocData({
      id: `${contact.category === 'Supplier' ? 'PO' : 'QT'}-2026-${Math.floor(100 + Math.random() * 900)}`,
      customer: contact.companyName,
      customerEmail: contact.primaryContact.email,
      recipientName: contact.primaryContact.name,
      ccEmails: ccListEmails,
      spindleModel: 'GPS-HSK-A63-24K',
      totalAmount: '₹8,45,000',
      date: '09 Sep 2026'
    });
    setIsComposerOpen(true);
  };

  // Open Add Contact Modal
  const handleOpenAddContact = () => {
    setEditingContact(null);
    setContactForm({
      companyName: '',
      category: 'Customer',
      tier: 'Tier 1 - Industrial Client',
      location: 'Pune Industrial Area, Maharashtra',
      gstin: '27AAAAA0000A1Z5',
      primaryName: '',
      primaryRole: '',
      primaryDept: 'Procurement',
      primaryEmail: '',
      primaryPhone: '+91 ',
      ccEmailsText: 'accounts@company.com, plant.head@company.com, qc.inward@company.com',
      notes: 'Standard quotation and invoice communication.'
    });
    setIsContactModalOpen(true);
  };

  // Open Edit Contact Modal
  const handleOpenEditContact = (contact) => {
    setEditingContact(contact);
    setContactForm({
      companyName: contact.companyName,
      category: contact.category,
      tier: contact.tier,
      location: contact.location,
      gstin: contact.gstin,
      primaryName: contact.primaryContact.name,
      primaryRole: contact.primaryContact.designation,
      primaryDept: contact.primaryContact.department,
      primaryEmail: contact.primaryContact.email,
      primaryPhone: contact.primaryContact.phone,
      ccEmailsText: contact.ccList.map(c => c.email).join(', '),
      notes: contact.notes || ''
    });
    setIsContactModalOpen(true);
  };

  // Save Contact (Add or Edit)
  const handleSaveContact = (e) => {
    e.preventDefault();

    // Parse CC emails text
    const ccEmails = contactForm.ccEmailsText
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.includes('@'));

    const parsedCcList = ccEmails.map((email, idx) => {
      let dept = 'General';
      let label = 'Official CC';
      if (email.includes('account') || email.includes('finance') || email.includes('bill')) {
        dept = 'Accounts';
        label = 'Accounts & Finance CC';
      } else if (email.includes('plant') || email.includes('maint') || email.includes('mfg')) {
        dept = 'Plant';
        label = 'Plant Operations CC';
      } else if (email.includes('qc') || email.includes('qual')) {
        dept = 'Quality';
        label = 'Quality Assurance CC';
      } else if (email.includes('store') || email.includes('gate') || email.includes('dispatch')) {
        dept = 'Stores';
        label = 'Stores & Inward CC';
      } else if (email.includes('purchase') || email.includes('sourc') || email.includes('procure')) {
        dept = 'Procurement';
        label = 'Purchase Desk CC';
      } else if (email.includes('gps')) {
        dept = 'Internal';
        label = 'GPS Internal CC';
      }

      return {
        id: `cc-${Date.now()}-${idx}`,
        label,
        email,
        dept,
        mandatoryFor: ['quotation', 'invoice']
      };
    });

    if (editingContact) {
      // Update
      setContacts(prev => prev.map(c => {
        if (c.id === editingContact.id) {
          return {
            ...c,
            companyName: contactForm.companyName,
            category: contactForm.category,
            tier: contactForm.tier,
            location: contactForm.location,
            gstin: contactForm.gstin,
            primaryContact: {
              ...c.primaryContact,
              name: contactForm.primaryName,
              designation: contactForm.primaryRole,
              department: contactForm.primaryDept,
              email: contactForm.primaryEmail,
              phone: contactForm.primaryPhone
            },
            ccList: parsedCcList,
            notes: contactForm.notes
          };
        }
        return c;
      }));
      if (onNotify) onNotify(`Updated contact details for ${contactForm.companyName}`);
    } else {
      // Add new
      const newContact = {
        id: `CNT-${Date.now().toString().slice(-4)}`,
        companyId: `CUST-${Date.now().toString().slice(-3)}`,
        companyName: contactForm.companyName,
        category: contactForm.category,
        tier: contactForm.tier,
        location: contactForm.location,
        gstin: contactForm.gstin,
        primaryContact: {
          name: contactForm.primaryName,
          designation: contactForm.primaryRole,
          department: contactForm.primaryDept,
          email: contactForm.primaryEmail,
          phone: contactForm.primaryPhone,
          isPrimary: true
        },
        ccList: parsedCcList,
        notes: contactForm.notes
      };
      setContacts(prev => [newContact, ...prev]);
      if (onNotify) onNotify(`Added new contact: ${contactForm.companyName}`);
    }

    setIsContactModalOpen(false);
  };

  // Delete Contact
  const handleDeleteContact = (contactId, companyName) => {
    if (window.confirm(`Are you sure you want to remove ${companyName} from the email directory?`)) {
      setContacts(prev => prev.filter(c => c.id !== contactId));
      if (onNotify) onNotify(`Removed ${companyName} from contact directory.`);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Company Name',
      'Category',
      'Tier',
      'Location',
      'GSTIN',
      'Primary Contact Name',
      'Primary Contact Role',
      'Primary Email (TO)',
      'Primary Phone',
      'Configured CC Emails',
      'Notes'
    ];

    const rows = contacts.map(c => [
      `"${c.companyName}"`,
      `"${c.category}"`,
      `"${c.tier}"`,
      `"${c.location}"`,
      `"${c.gstin}"`,
      `"${c.primaryContact.name}"`,
      `"${c.primaryContact.designation}"`,
      `"${c.primaryContact.email}"`,
      `"${c.primaryContact.phone}"`,
      `"${c.ccList.map(cc => cc.email).join('; ')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GPS_Spindle_Contacts_And_CC_Directory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onNotify) {
      onNotify(`Exported ${contacts.length} company email directories to CSV.`);
    }
  };

  if (isLoading) {
    return (
      <div className="content-area">
        <PageHeader
          title="Contacts & Email Directory"
          subtitle="Loading centralized contact directory from live database..."
          badge="Live Supabase"
        />
        <div className="section-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-icon" style={{ marginBottom: '12px', color: 'var(--primary)' }} />
          <div>Fetching client and supplier contacts from database...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader
          title="Contacts & Email Directory"
          subtitle="Centralized client & vendor email directory with systematically pre-stored CC groups"
          badge="Database Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {error.message || 'Unable to retrieve live contact records from PostgreSQL database.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadContacts}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      {/* 1. TOP HEADER */}
      <PageHeader
        title="Contacts & Email Directory"
        subtitle="Centralized client & vendor email directory with systematically pre-stored CC groups"
        badge={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <AtSign size={13} />
            {totalCompanies} Companies • {totalCcCount} Stored CCs
          </span>
        }
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            title="Download full CSV email and CC register"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddContact}
            title="Register a new company with primary contact and CC emails"
          >
            <Plus size={14} />
            <span>+ Add Contact & CCs</span>
          </button>
        </div>
      </PageHeader>

      {/* 2. TOP METRIC SUMMARY STRIP */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '14px'
      }}>
        <div className="section-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Configured Companies</div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>{totalCompanies} Accounts</div>
          </div>
        </div>

        <div className="section-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Primary Recipients (TO)</div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>{totalCompanies} Direct Leads</div>
          </div>
        </div>

        <div className="section-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <Mail size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pre-Stored CC Addresses</div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>{totalCcCount} Verified CCs</div>
          </div>
        </div>

        <div className="section-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Search Elimination</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#b45309' }}>1-Click Copy Ready</div>
          </div>
        </div>
      </div>

      {/* 3. INTERNAL GPS SPINDLE OFFICIAL CC QUICK BAR */}
      <div className="section-card" style={{ padding: '12px 16px', marginBottom: '14px', background: '#fafaf9', border: '1px solid #e7e5e4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
            <Briefcase size={14} color="var(--primary)" />
            <span>GPS Spindle Internal Official CCs (Quick 1-Click Copy)</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Official internal addresses to keep GPS stakeholders in the loop
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {INTERNAL_GPS_CCS.map((gps) => {
            const isCopied = copiedKey === `internal-${gps.id}`;
            return (
              <button
                key={gps.id}
                type="button"
                onClick={() => copyToClipboard(gps.email, `internal-${gps.id}`, gps.label)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  background: isCopied ? '#ecfdf5' : '#ffffff',
                  border: `1px solid ${isCopied ? '#10b981' : 'var(--border-color)'}`,
                  borderRadius: '16px',
                  fontSize: '11.5px',
                  color: isCopied ? '#059669' : 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={`Click to copy: ${gps.email} (${gps.role})`}
              >
                <span style={{ fontWeight: 600 }}>{gps.label}:</span>
                <span className="mono" style={{ color: 'var(--primary)', fontWeight: 500 }}>{gps.email}</span>
                {isCopied ? <Check size={12} color="#059669" /> : <Copy size={11} color="var(--text-muted)" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. UNIVERSAL SEARCH & CATEGORY FILTER BAR */}
      <div className="section-card" style={{ padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Universal Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search company, person, direct email, or any CC email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
            />
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['All', 'Customer', 'Supplier'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCategoryFilter(cat)}
                style={{ fontSize: '11.5px', height: '34px', padding: '0 12px' }}
              >
                {cat === 'All' ? 'All Contacts' : `${cat}s`}
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Dept / Function:</span>
            <select
              className="form-control"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ height: '34px', fontSize: '12px', minWidth: '130px' }}
            >
              <option value="All">All Departments</option>
              <option value="Procurement">Procurement & Sourcing</option>
              <option value="Accounts">Accounts & Invoicing (Billing)</option>
              <option value="Plant">Plant & Maintenance</option>
              <option value="Quality">Quality & Metrology</option>
              <option value="Stores">Stores & Inward Logistics</option>
            </select>
          </div>

          {(searchQuery || categoryFilter !== 'All' || deptFilter !== 'All') && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setDeptFilter('All');
              }}
              style={{ height: '34px' }}
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredContacts.length}</strong> of {contacts.length} companies
          </div>
        </div>
      </div>

      {/* 5. SYSTEMATIC CONTACT CARDS DIRECTORY */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredContacts.length === 0 ? (
          <div className="section-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Mail size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)' }}>No matching contacts found</h4>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your search query or reset the category filters.</p>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isPrimaryCopied = copiedKey === `to-${contact.id}`;
            const isAllCcCopied = copiedKey === `all-cc-${contact.id}`;
            const isBothCopied = copiedKey === `all-both-${contact.id}`;

            return (
              <div key={contact.id} className="section-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Top Header of the Company Card */}
                <div style={{
                  padding: '12px 18px',
                  background: 'var(--bg-surface-subtle)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: contact.category === 'Supplier' ? '#0284c7' : 'var(--primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}>
                      {contact.companyName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {contact.companyName}
                        </h3>
                        <span className="nav-badge" style={{
                          background: contact.category === 'Supplier' ? '#eff6ff' : 'var(--primary-light)',
                          color: contact.category === 'Supplier' ? '#1d4ed8' : 'var(--primary)',
                          fontSize: '10.5px'
                        }}>
                          {contact.tier}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        📍 {contact.location} • <span className="mono">GSTIN: {contact.gstin}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Header Toolbar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopyAllCcs(contact)}
                      title="Copy all configured CC email addresses to clipboard"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                    >
                      {isAllCcCopied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      <span>{isAllCcCopied ? 'Copied CCs!' : 'Copy All CCs'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopyAllRecipients(contact)}
                      title="Copy primary TO and all CC email addresses to clipboard"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                    >
                      {isBothCopied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      <span>{isBothCopied ? 'Copied All!' : 'Copy TO + CCs'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleComposeForContact(contact)}
                      title="Open Outlook-style email composer with this company's emails pre-filled"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                    >
                      <Send size={12} />
                      <span>Compose Email</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm btn-icon"
                      onClick={() => handleOpenEditContact(contact)}
                      title="Edit contact & CC list"
                      style={{ padding: '4px 8px' }}
                    >
                      <Edit3 size={13} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm btn-icon"
                      onClick={() => handleDeleteContact(contact.id, contact.companyName)}
                      title="Remove from directory"
                      style={{ padding: '4px 8px', color: '#dc2626' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Body: Primary Contact (TO) & Systematic CC Emails */}
                <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(340px, 1.8fr)', gap: '16px' }}>
                  {/* Left Column: Primary Contact (TO) */}
                  <div style={{
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>
                          Primary Recipient (TO Field)
                        </span>
                        <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                          {contact.primaryContact.department}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                        {contact.primaryContact.name}
                      </div>

                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {contact.primaryContact.designation}
                      </div>

                      {/* Direct Email with 1-Click Copy */}
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <Mail size={13} color="var(--primary)" />
                          <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {contact.primaryContact.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => copyToClipboard(contact.primaryContact.email, `to-${contact.id}`, 'Primary Email')}
                          style={{ padding: '2px 6px', fontSize: '10.5px', height: '22px' }}
                          title="Copy TO email address"
                        >
                          {isPrimaryCopied ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                          <span>{isPrimaryCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* Phone */}
                      {contact.primaryContact.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          <Phone size={12} color="var(--text-muted)" />
                          <span className="mono">{contact.primaryContact.phone}</span>
                        </div>
                      )}
                    </div>

                    {contact.notes && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px' }}>
                        💡 <em>{contact.notes}</em>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Stored CC Emails Grouped Systematically */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                        Pre-Stored CC Emails ({contact.ccList.length} Verified Addresses)
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Click any chip to copy individual email
                      </span>
                    </div>

                    {/* CC List Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                      {contact.ccList.map((cc) => {
                        const isCopied = copiedKey === `chip-${cc.id}`;
                        const isAccounts = cc.dept === 'Accounts';
                        const isPlant = cc.dept === 'Plant';
                        const isQuality = cc.dept === 'Quality';
                        const isInternal = cc.dept === 'Internal';

                        return (
                          <div
                            key={cc.id}
                            onClick={() => copyToClipboard(cc.email, `chip-${cc.id}`, cc.label)}
                            style={{
                              padding: '8px 10px',
                              background: isCopied ? '#ecfdf5' : '#ffffff',
                              border: `1px solid ${isCopied ? '#10b981' : 'var(--border-color)'}`,
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              transition: 'all 0.12s ease'
                            }}
                            title={`Click to copy: ${cc.email}`}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: isAccounts ? '#b45309' : isPlant ? '#7A1F3D' : isQuality ? '#7c3aed' : isInternal ? '#0284c7' : 'var(--text-muted)'
                              }}>
                                {cc.label}
                              </span>
                              {isCopied ? (
                                <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>Copied!</span>
                              ) : (
                                <Copy size={11} color="var(--text-muted)" />
                              )}
                            </div>

                            <div className="mono" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>
                              {cc.email}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. MODAL: ADD / EDIT CONTACT */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={editingContact ? `Edit Contact & CCs: ${editingContact.companyName}` : 'Add Company Contact & CC Email Group'}
        maxWidth="680px"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsContactModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveContact}
            >
              <Check size={13} />
              <span>{editingContact ? 'Save Changes' : 'Add to Directory'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveContact}>
          <div className="form-grid">
            {/* Company Name */}
            <div className="form-group full-width">
              <label className="form-label">Company / Account Name</label>
              <input
                type="text"
                className="form-control"
                required
                value={contactForm.companyName}
                onChange={(e) => setContactForm(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="e.g. Tata Motors Ltd / Siemens Machine Tools"
              />
            </div>

            {/* Category & Tier */}
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={contactForm.category}
                onChange={(e) => setContactForm(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="Customer">Customer / Client</option>
                <option value="Supplier">Supplier / Vendor</option>
                <option value="Partner">Technical Partner</option>
              </select>
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
              <label className="form-label">Contact Person Name</label>
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
              <label className="form-label">Primary Direct Email (TO)</label>
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
              <label className="form-label">Special Invoicing & Communication Instructions</label>
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

      {/* 7. OUTLOOK-STYLE EMAIL COMPOSER */}
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
    </div>
  );
}
