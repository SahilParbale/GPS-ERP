import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import { CUSTOMERS, SPINDLES } from '../data/mockData';
import { 
  Search, Users, Building, Phone, Mail, FileText, 
  Disc, Wrench, DollarSign, ArrowLeft, Eye 
} from 'lucide-react';

export default function CustomersScreen({ onNavigate, onNotify }) {
  const [selectedCustomer, setSelectedCustomer] = useState(CUSTOMERS[0]);
  const [activeTab, setActiveTab] = useState('fleet');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = CUSTOMERS.filter((c) => {
    const q = searchQuery.toLowerCase();
    return !q || 
      c.name.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q);
  });

  const customerSpindles = SPINDLES.filter(s => s.customerId === selectedCustomer.id || s.customer.includes(selectedCustomer.name.split(' ')[0]));

  return (
    <div className="content-area">
      <PageHeader 
        title="Industrial Customer Accounts" 
        subtitle="Tier-1 automotive, aerospace, and precision engineering client fleet directory"
        badge={`${CUSTOMERS.length} Enterprise Clients`}
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
                key={cust.id}
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  background: selectedCustomer.id === cust.id ? 'var(--primary-light)' : 'transparent',
                  borderLeft: selectedCustomer.id === cust.id ? '4px solid var(--primary)' : '4px solid transparent',
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
          </div>
        </div>

        {/* Right: Selected Customer Deep Dive Profile */}
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
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Business Value</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{selectedCustomer.totalBusiness}</div>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Credit Terms: {selectedCustomer.creditTerms}</div>
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
                onClick={() => onNavigate && onNavigate('contacts')}
                style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 8px' }}
                title="View systematic CC email list for this customer"
              >
                <span>View Stored CCs →</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs */}
          <Tabs 
            tabs={[
              { id: 'fleet', label: 'Installed Spindle Fleet', count: customerSpindles.length },
              { id: 'orders', label: 'Active Work Orders', count: selectedCustomer.activeOrders },
              { id: 'service', label: 'Service Log' },
              { id: 'documents', label: 'Contracts & GST Docs' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab: Fleet */}
          {activeTab === 'fleet' && (
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
                  {customerSpindles.map((sp) => (
                    <tr key={sp.serialNumber}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{sp.serialNumber}</td>
                      <td>{sp.model}</td>
                      <td className="mono">{sp.rpm} • {sp.power}</td>
                      <td><StatusBadge status={sp.status} size="sm" /></td>
                      <td style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>{sp.warranty}</td>
                    </tr>
                  ))}
                  {customerSpindles.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        Registered fleet records linked in Master Registry
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: Active Orders */}
          {activeTab === 'orders' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>WO-2026-104</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>GPS-HSK-A63-24K Precision Motorized Spindle</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stage: Bay 2 Studer Cylindrical Grinding</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status="In Progress" />
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Target: 05-Mar-2026</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Service */}
          {activeTab === 'service' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="mono" style={{ fontWeight: 600, color: '#dc2626' }}>SR-2026-042</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Factory Rebuild & Dynamic Recalibration</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Front ceramic bearing pack replacement & taper grinding</div>
                </div>
                <StatusBadge status="In Progress" />
              </div>
            </div>
          )}

          {/* Tab: Documents */}
          {activeTab === 'documents' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { name: "Master Spindle Supply Agreement (FY 2025-27).pdf", size: "3.2 MB" },
                { name: "Corporate GSTIN Registration Certificate.pdf", size: "820 KB" },
                { name: "Approved Quality Assurance Plan (QAP).pdf", size: "1.6 MB" },
              ].map((doc, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} color="#7A1F3D" />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{doc.name}</span>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNotify(`Downloading ${doc.name}`)}>Download</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
