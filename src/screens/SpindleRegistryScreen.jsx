import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { SPINDLES } from '../data/mockData';
import { 
  Search, Filter, Plus, Eye, Wrench, Download, 
  Disc, CheckCircle2, Shield, QrCode 
} from 'lucide-react';

export default function SpindleRegistryScreen({ onNavigate, onSelectSpindle, onNotify }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const filteredSpindles = SPINDLES.filter((sp) => {
    const matchesType = typeFilter === 'all' || sp.type.toLowerCase().includes(typeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sp.status.toLowerCase() === statusFilter.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      sp.serialNumber.toLowerCase().includes(query) ||
      sp.model.toLowerCase().includes(query) ||
      sp.customer.toLowerCase().includes(query) ||
      sp.type.toLowerCase().includes(query);
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="content-area">
      <PageHeader 
        title="Spindle Fleet & Asset Registry" 
        subtitle="Digital serial registry of precision spindles manufactured and serviced by GPS Spindle"
        badge={`${SPINDLES.length} Installed Units`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => onNotify('Exported Spindle Registry (CSV)')}
        >
          <Download size={14} />
          <span>Export Registry</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => setIsRegisterOpen(true)}
        >
          <Plus size={14} />
          <span>Register Serial</span>
        </button>
      </PageHeader>

      {/* Main Table Card */}
      <div className="section-card">
        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-group">
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="form-control"
                placeholder="Search Serial, Model, Customer..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select 
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Spindle Types</option>
              <option value="motorized">Motorized Electro-Spindle</option>
              <option value="belt">Belt Driven</option>
              <option value="high frequency">High Frequency Direct</option>
              <option value="geared">High Torque Geared</option>
              <option value="grinding">Internal Grinding</option>
            </select>

            <select 
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Operational Statuses</option>
              <option value="in production">In Production</option>
              <option value="qc pending">QC Pending</option>
              <option value="ready">Ready</option>
              <option value="dispatched">Dispatched / Field Active</option>
              <option value="under service">Under Service</option>
            </select>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredSpindles.length}</strong> of {SPINDLES.length} recorded assets
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Model Family</th>
                <th>Customer / Plant</th>
                <th>Type</th>
                <th>Max RPM</th>
                <th>Power (kW)</th>
                <th>Runout (Nose)</th>
                <th>Status</th>
                <th>Mfg Date</th>
                <th>Warranty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpindles.map((sp) => (
                <tr key={sp.serialNumber}>
                  <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {sp.serialNumber}
                  </td>
                  <td style={{ fontWeight: 600 }}>{sp.model}</td>
                  <td>{sp.customer}</td>
                  <td style={{ fontSize: '12px' }}>{sp.type}</td>
                  <td className="mono" style={{ fontWeight: 500 }}>{sp.rpm}</td>
                  <td className="mono">{sp.power}</td>
                  <td className="mono" style={{ color: '#0284c7' }}>{sp.runoutTaper}</td>
                  <td>
                    <StatusBadge status={sp.status} />
                  </td>
                  <td className="mono" style={{ fontSize: '12px' }}>{sp.manufacturingDate}</td>
                  <td style={{ fontSize: '11px' }}>
                    <span style={{ 
                      color: sp.warranty.includes('Active') ? '#059669' : sp.warranty.includes('Production') ? '#0284c7' : '#d97706',
                      fontWeight: 600
                    }}>
                      {sp.warranty}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (onSelectSpindle) onSelectSpindle(sp);
                          onNavigate('spindle-detail');
                        }}
                        title="View Digital Twin Profile"
                      >
                        <Eye size={13} />
                        <span>Twin</span>
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm btn-icon"
                        onClick={() => onNotify(`Viewing Service History for ${sp.serialNumber}`)}
                        title="Service History"
                      >
                        <Wrench size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Serial Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register New Manufactured Spindle Serial"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsRegisterOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => {
              setIsRegisterOpen(false);
              onNotify('Spindle registered into digital registry.');
            }}>Save to Registry</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Assigned Serial Number</label>
            <input type="text" className="form-control mono" defaultValue="GPS-2026-0852" />
          </div>
          <div className="form-group">
            <label className="form-label">Spindle Model</label>
            <input type="text" className="form-control" defaultValue="GPS-HSK-A63-24K" />
          </div>
          <div className="form-group">
            <label className="form-label">Commissioned Customer</label>
            <input type="text" className="form-control" defaultValue="Tata Advanced Systems Ltd" />
          </div>
          <div className="form-group">
            <label className="form-label">Warranty Period</label>
            <select className="form-control">
              <option>24 Months / 4,000 Hours</option>
              <option>12 Months / 2,500 Hours</option>
              <option>18 Months / 3,000 Hours</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
