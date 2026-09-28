import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import { customerService } from '../services/database/customerService';
import { contactService } from '../services/database/contactService';
import { documentService } from '../services/database/documentService';
import { CustomerScreenSkeleton } from '../components/common/Skeleton';
import { 
  Search, Users, Phone, Mail, FileText, 
  RefreshCw, AlertCircle, Download, CheckCircle2, Star
} from 'lucide-react';

export default function CustomersScreen({ onNavigate, onNotify }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('fleet');
  const [searchQuery, setSearchQuery] = useState('');

  // Live sub-data state for selected customer
  const [subData, setSubData] = useState({
    spindles: [],
    workOrders: [],
    serviceRequests: [],
    documents: [],
    contacts: []
  });
  const [isSubLoading, setIsSubLoading] = useState(false);
  const [subError, setSubError] = useState(null);

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount) || amount <= 0) return '₹0.00';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const loadCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [res, metricsRes] = await Promise.all([
        customerService.getCustomers(),
        customerService.getAllCustomerMetrics()
      ]);

      if (res.error) {
        setError(res.error);
        setIsLoading(false);
        return;
      }

      const metricsMap = metricsRes.data || new Map();
      const data = res.data || [];

      const normalized = data.map(c => {
        const m = metricsMap.get(c.id) || {
          installedFleet: 0,
          workOrdersCount: 0,
          activeOrders: 0,
          totalInvoiced: 0,
          outstandingBalance: 0
        };

        return {
          id: c.customer_code || c.id,
          dbId: c.id,
          name: c.company_name,
          rating: typeof c.rating === 'number' ? `★ ${c.rating}` : (c.rating || 'Tier 1'),
          industry: c.industry_segment || 'Precision Engineering',
          location: `${c.city || ''}, ${c.state || ''}`.replace(/^,\s*|,\s*$/g, '') || c.billing_address || 'Pune, Maharashtra',
          gstin: c.gstin || 'N/A',
          creditTerms: c.payment_terms || 'Net 30 Days',
          contactName: c.primary_contact_name || 'Not Assigned',
          contactEmail: c.primary_email || 'Not Assigned',
          contactPhone: c.primary_phone || 'Not Assigned',
          installedFleet: m.installedFleet,
          workOrdersCount: m.workOrdersCount,
          activeOrders: m.activeOrders,
          totalBusinessNum: m.totalInvoiced,
          totalBusiness: formatCurrency(m.totalInvoiced),
          outstandingBalanceNum: m.outstandingBalance,
          outstandingBalance: formatCurrency(m.outstandingBalance)
        };
      });

      setCustomers(normalized);
      if (normalized.length > 0) {
        setSelectedCustomer(prev => {
          if (!prev) return normalized[0];
          return normalized.find(c => c.dbId === prev.dbId) || normalized[0];
        });
      }
    } catch (err) {
      setError({ message: err.message || 'Failed to load customer records' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerSubData = useCallback(async (customerId) => {
    if (!customerId) return;
    setIsSubLoading(true);
    setSubError(null);
    try {
      const [spindlesRes, workOrdersRes, serviceRes, docsRes, contactsRes] = await Promise.all([
        customerService.getCustomerSpindles(customerId),
        customerService.getCustomerWorkOrders(customerId),
        customerService.getCustomerServiceRequests(customerId),
        customerService.getCustomerDocuments(customerId),
        contactService.getCustomerContacts(customerId)
      ]);

      if (spindlesRes.error || workOrdersRes.error || serviceRes.error || docsRes.error || contactsRes.error) {
        const errMsg = spindlesRes.error || workOrdersRes.error || serviceRes.error || docsRes.error || contactsRes.error;
        setSubError(errMsg);
      }

      setSubData({
        spindles: spindlesRes.data || [],
        workOrders: workOrdersRes.data || [],
        serviceRequests: serviceRes.data || [],
        documents: docsRes.data || [],
        contacts: contactsRes.data || []
      });
    } catch (err) {
      setSubError(err.message || 'Failed to load customer sub-data');
    } finally {
      setIsSubLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer?.dbId) {
      loadCustomerSubData(selectedCustomer.dbId);
    }
  }, [selectedCustomer?.dbId, loadCustomerSubData]);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return !q || 
      c.name.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q);
  });

  const handleDownloadDocument = async (doc) => {
    try {
      if (onNotify) onNotify(`Generating secure signed download for ${doc.file_name}...`);
      const { data, error: urlErr } = await documentService.getSignedDocumentUrl(
        doc.storage_bucket,
        doc.storage_path,
        3600
      );

      if (urlErr || !data?.signedUrl) {
        if (onNotify) onNotify(`Download failed: ${urlErr?.message || 'Access restricted by RLS'}`, 'error');
        return;
      }

      window.open(data.signedUrl, '_blank');
      if (onNotify) onNotify(`Downloaded: ${doc.file_name}`, 'success');
    } catch (err) {
      if (onNotify) onNotify(`Download failed: ${err.message}`, 'error');
    }
  };

  const handleSetPrimaryContact = async (contactId) => {
    if (!selectedCustomer?.dbId || !contactId) return;
    try {
      if (onNotify) onNotify('Updating primary contact in database...');
      const res = await contactService.setPrimaryContact(selectedCustomer.dbId, contactId);
      if (res.error) {
        if (onNotify) onNotify(`Failed: ${res.error}`, 'error');
        return;
      }
      if (onNotify) onNotify('Primary contact updated successfully', 'success');
      loadCustomerSubData(selectedCustomer.dbId);
      loadCustomers();
    } catch (err) {
      if (onNotify) onNotify(`Error: ${err.message}`, 'error');
    }
  };

  if (isLoading) {
    return <CustomerScreenSkeleton />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Industrial Customer Accounts" 
          subtitle="Tier-1 automotive, aerospace, and precision engineering client fleet directory"
          badge="Database Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {error.message || 'Unable to retrieve live customer records from PostgreSQL database.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadCustomers}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Industrial Customer Accounts" 
          subtitle="Tier-1 automotive, aerospace, and precision engineering client fleet directory"
          badge="0 Enterprise Clients"
        />
        <div className="section-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>No Customer Accounts Found</div>
          <p style={{ fontSize: '13px' }}>The live customers database table currently contains zero records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Industrial Customer Accounts" 
        subtitle="Tier-1 automotive, aerospace, and precision engineering client fleet directory"
        badge={`${customers.length} Enterprise Clients`}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onNavigate && onNavigate('contacts')}
          title="Open systematic contacts and CC email directory"
        >
          <Mail size={14} />
          <span>Email & CC Directory</span>
        </button>
      </PageHeader>

      <div className="grid-2col-cust">
        {/* Left: Customers List */}
        <div className="section-card">
          <div className="filter-bar">
            <div className="search-input-wrap" style={{ width: '100%' }}>
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="form-control"
                placeholder="Search Client, Industry, Location..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredCustomers.map((cust) => (
              <div 
                key={cust.dbId || cust.id}
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  background: selectedCustomer?.dbId === cust.dbId ? 'var(--primary-light)' : 'transparent',
                  borderLeft: selectedCustomer?.dbId === cust.dbId ? '4px solid var(--primary)' : '4px solid transparent',
                  transition: 'background 0.15s'
                }}
                onClick={() => setSelectedCustomer(cust)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '14px' }}>{cust.name}</strong>
                  <span className="nav-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '10px' }}>{cust.rating}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {cust.industry}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>{cust.location}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{cust.installedFleet} Spindles</span>
                </div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No clients match your filter query.
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Customer Deep Dive Profile */}
        {selectedCustomer && (
        <div className="section-card">
          {/* Customer Header */}
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{selectedCustomer.name}</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedCustomer.industry} • {selectedCustomer.location}
                </div>
                <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  GSTIN: {selectedCustomer.gstin}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Invoiced Business</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{selectedCustomer.totalBusiness}</div>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Credit Terms: {selectedCustomer.creditTerms}</div>
                {selectedCustomer.outstandingBalanceNum > 0 && (
                  <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 600, marginTop: '2px' }}>
                    Outstanding: {selectedCustomer.outstandingBalance}
                  </div>
                )}
              </div>
            </div>

            {/* Primary Contact Info Bar */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <Users size={14} color="var(--text-muted)" />
                <strong>{selectedCustomer.contactName}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <Phone size={14} color="var(--text-muted)" />
                <span className="mono">{selectedCustomer.contactPhone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <Mail size={14} color="var(--text-muted)" />
                <span className="mono">{selectedCustomer.contactEmail}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('contacts')}
                style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 8px' }}
                title="View contacts and CC recipients for this customer"
              >
                <span>View Stored CCs →</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs */}
          <Tabs 
            tabs={[
              { id: 'fleet', label: 'Installed Spindle Fleet', count: subData.spindles.length },
              { id: 'orders', label: 'Work Orders', count: subData.workOrders.length },
              { id: 'service', label: 'Service Log', count: subData.serviceRequests.length },
              { id: 'documents', label: 'Contracts & GST Docs', count: subData.documents.length },
              { id: 'contacts', label: 'Key Contacts & CCs', count: subData.contacts.length }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Sub-Tab Loading State */}
          {isSubLoading && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="spin-icon" style={{ marginBottom: '8px', color: 'var(--primary)' }} />
              <div style={{ fontSize: '13px' }}>Loading customer records from live database...</div>
            </div>
          )}

          {/* Sub-Tab Error State */}
          {!isSubLoading && subError && (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <AlertCircle size={24} color="#dc2626" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>Unable to load sub-tab data</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>{subError}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadCustomerSubData(selectedCustomer.dbId)}>
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Tab: Fleet */}
          {!isSubLoading && !subError && activeTab === 'fleet' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Spindle Serial</th>
                    <th>Model</th>
                    <th>Speed / Power</th>
                    <th>Status</th>
                    <th>Warranty</th>
                  </tr>
                </thead>
                <tbody>
                  {subData.spindles.map((sp) => (
                    <tr key={sp.id || sp.serial_number}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{sp.serial_number}</td>
                      <td>{sp.model?.model_name || sp.model_code || 'Precision Motorized Spindle'}</td>
                      <td className="mono">
                        {sp.max_rpm ? `${Number(sp.max_rpm).toLocaleString('en-IN')} RPM` : 'Standard'} 
                        {sp.power_kw ? ` • ${sp.power_kw} kW` : ''}
                      </td>
                      <td><StatusBadge status={sp.status || 'Active'} size="sm" /></td>
                      <td style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                        {sp.warranty_period || '12 Months Standard'}
                      </td>
                    </tr>
                  ))}
                  {subData.spindles.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No installed spindles currently registered for this customer account in the Master Registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Active Work Orders */}
          {!isSubLoading && !subError && activeTab === 'orders' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {subData.workOrders.map((wo) => (
                <div 
                  key={wo.id || wo.work_order_no}
                  style={{ 
                    padding: '14px', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--bg-surface-subtle)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{wo.work_order_no}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                      {wo.model?.model_name || wo.model?.model_code || (wo.spindle?.serial_number ? `Spindle: ${wo.spindle.serial_number}` : 'Precision Spindle Order')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Stage: {wo.current_stage || 'Assembly'} {wo.bay?.name ? `• ${wo.bay.name}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={wo.status || 'In Progress'} />
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Target: {wo.target_delivery_date || 'Schedule Pending'}
                    </div>
                    {typeof wo.progress_percentage === 'number' && (
                      <div className="mono" style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                        Progress: {wo.progress_percentage}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {subData.workOrders.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No active or historical work orders found for this customer.
                </div>
              )}
            </div>
          )}

          {/* Tab: Service Log */}
          {!isSubLoading && !subError && activeTab === 'service' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {subData.serviceRequests.map((sr) => (
                <div 
                  key={sr.id || sr.sr_number}
                  style={{ 
                    padding: '14px', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontWeight: 600, color: '#dc2626' }}>{sr.sr_number}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                      {sr.spindle_model || 'Spindle Overhaul'} {sr.serial_number ? `(S/N: ${sr.serial_number})` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {sr.failure_description || sr.reported_symptoms || 'Overhaul, dynamic balancing & runout recalibration'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Inward: {sr.inward_date || 'N/A'} • Priority: {sr.priority || 'Normal'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={sr.status || 'In Progress'} />
                    {sr.jobs && sr.jobs.length > 0 && sr.jobs[0].total_service_cost && (
                      <div className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                        Cost: ₹{Number(sr.jobs[0].total_service_cost).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {subData.serviceRequests.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No service requests or spindle maintenance tickets found for this customer.
                </div>
              )}
            </div>
          )}

          {/* Tab: Documents */}
          {!isSubLoading && !subError && activeTab === 'documents' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {subData.documents.map((doc) => (
                <div 
                  key={doc.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '12px 14px', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--bg-surface-subtle)' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={20} color="#7A1F3D" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{doc.title}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {doc.file_name} • {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(1)} KB` : 'PDF'} • {doc.document_type || 'Document'}
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleDownloadDocument(doc)}
                    title="Download document via secure signed URL"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              ))}
              {subData.documents.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No technical drawings, contracts, or metrology certificates attached for this customer account.
                </div>
              )}
            </div>
          )}

          {/* Tab: Contacts */}
          {!isSubLoading && !subError && activeTab === 'contacts' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contact Person</th>
                    <th>Role / Department</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subData.contacts.map((cnt) => (
                    <tr key={cnt.id}>
                      <td>
                        <strong>{cnt.name}</strong>
                        {cnt.is_primary && (
                          <span className="nav-badge" style={{ marginLeft: '8px', background: 'var(--primary)', color: '#fff', fontSize: '9px' }}>
                            Primary
                          </span>
                        )}
                        {cnt.is_default_cc && (
                          <span className="nav-badge" style={{ marginLeft: '4px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '9px' }}>
                            Default CC
                          </span>
                        )}
                      </td>
                      <td>
                        <div>{cnt.designation || 'Contact'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cnt.department || 'General'}</div>
                      </td>
                      <td className="mono" style={{ fontSize: '12px' }}>{cnt.email}</td>
                      <td className="mono" style={{ fontSize: '12px' }}>{cnt.phone || '—'}</td>
                      <td>
                        {cnt.is_primary ? (
                          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Active Primary</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Contact Person</span>
                        )}
                      </td>
                      <td>
                        {!cnt.is_primary && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSetPrimaryContact(cnt.id)}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                            title="Set as primary contact for this customer"
                          >
                            <Star size={11} />
                            <span>Set Primary</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {subData.contacts.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No contact persons currently registered in the database for this customer account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

