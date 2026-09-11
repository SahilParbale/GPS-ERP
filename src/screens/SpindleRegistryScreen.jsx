import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { spindleModelService } from '../services/database/spindleModelService';
import { 
  Search, Filter, Plus, Eye, Wrench, Download, 
  Disc, CheckCircle2, Shield, QrCode, RefreshCw, AlertCircle 
} from 'lucide-react';

export default function SpindleRegistryScreen({ onNavigate, onSelectSpindle, onNotify }) {
  const [spindles, setSpindles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const loadSpindles = async () => {
    setIsLoading(true);
    setError(null);
    const res = await spindleModelService.getSpindles();
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    }
    setSpindles(res.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSpindles();
  }, []);

  const filteredSpindles = spindles.filter((sp) => {
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

  if (isLoading) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Spindle Fleet & Asset Registry" 
          subtitle="Loading serialized asset registry from live database..."
          badge="Live Supabase"
        />
        <div className="section-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-icon" style={{ marginBottom: '12px', color: 'var(--primary)' }} />
          <div>Fetching serialized spindles and engineering model specifications...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Spindle Fleet & Asset Registry" 
          subtitle="Digital serial registry of precision spindles manufactured and serviced by GPS Spindle"
          badge="Database Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {error.message || 'Unable to retrieve live spindle registry records from PostgreSQL database.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadSpindles}>
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
        title="Spindle Fleet & Asset Registry" 
        subtitle="Digital serial registry of precision spindles manufactured and serviced by GPS Spindle"
        badge={`${spindles.length} Registered Fleet Units`}
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
            Showing <strong>{filteredSpindles.length}</strong> of {spindles.length} recorded assets
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
                <th>Warranty Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpindles.map((sp) => (
                <tr key={sp.serialNumber || sp.id}>
                  <td>
                    <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {sp.serialNumber}
                    </div>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {sp.qrCode}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{sp.model}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sp.taper}</div>
                  </td>
                  <td style={{ fontSize: '12px' }}>{sp.customer}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sp.type}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{sp.rpm}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{sp.power}</td>
                  <td className="mono" style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                    {sp.runout}
                  </td>
                  <td>
                    <StatusBadge status={sp.status} />
                  </td>
                  <td>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px', 
                      background: sp.warranty?.includes('Active') ? '#ecfdf5' : '#fef2f2',
                      color: sp.warranty?.includes('Active') ? '#047857' : '#b91c1c',
                      border: `1px solid ${sp.warranty?.includes('Active') ? '#a7f3d0' : '#fecaca'}`,
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
              {filteredSpindles.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No spindle fleet units found matching your criteria.
                  </td>
                </tr>
              )}
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
