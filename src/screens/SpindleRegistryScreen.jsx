import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { spindleModelService } from '../services/database/spindleModelService';
import { customerService } from '../services/database/customerService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Filter, Plus, Eye, Wrench, Download, 
  Disc, CheckCircle2, Shield, QrCode, RefreshCw, AlertCircle,
  ShieldAlert
} from 'lucide-react';

export default function SpindleRegistryScreen({ onNavigate, onSelectSpindle, onNotify }) {
  const { role, profile } = useAuth();
  const userRole = (profile?.role?.code || profile?.role || role?.code || role || '').toUpperCase();
  const canRegister = ['ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'].includes(userRole);

  const [spindles, setSpindles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [suggestedSerial, setSuggestedSerial] = useState('');
  const [formData, setFormData] = useState({
    serialNumber: '',
    modelId: '',
    customerId: '',
    warrantyPeriod: 'Active (24 Months / 4,000h)',
    status: 'In Production',
    currentLocation: 'Pune Plant 1',
    notes: ''
  });

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

  const handleOpenRegister = async () => {
    setIsRegisterOpen(true);
    setRegisterError(null);
    setIsLoadingMeta(true);

    try {
      const [modelsRes, custRes, nextSerial] = await Promise.all([
        models.length > 0 ? Promise.resolve({ data: models }) : spindleModelService.getSpindleModels(),
        customers.length > 0 ? Promise.resolve({ data: customers }) : customerService.getCustomers({ select: 'id, company_name, customer_code' }),
        spindleModelService.getNextSuggestedSerial()
      ]);

      const loadedModels = modelsRes.data || [];
      const loadedCustomers = custRes.data || [];
      if (models.length === 0 && loadedModels.length > 0) setModels(loadedModels);
      if (customers.length === 0 && loadedCustomers.length > 0) setCustomers(loadedCustomers);

      setSuggestedSerial(nextSerial);
      setFormData({
        serialNumber: nextSerial,
        modelId: loadedModels[0]?.id || '',
        customerId: '',
        warrantyPeriod: 'Active (24 Months / 4,000h)',
        status: 'In Production',
        currentLocation: 'Pune Plant 1',
        notes: ''
      });
    } catch (err) {
      console.warn('[GPS-ERP Spindles] Failed loading metadata for registration:', err);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const handleRegisterSpindle = async (e) => {
    if (e) e.preventDefault();
    if (!formData.serialNumber.trim()) {
      setRegisterError('Serial number is required.');
      return;
    }
    if (!formData.modelId) {
      setRegisterError('Please select a spindle engineering model.');
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);

    const payload = {
      serial_number: formData.serialNumber.trim(),
      model_id: formData.modelId,
      customer_id: formData.customerId || null,
      warranty_period: formData.warrantyPeriod,
      status: formData.status,
      current_location: formData.currentLocation,
      notes: formData.notes
    };

    const res = await spindleModelService.registerSpindle(payload);

    if (res.error) {
      setRegisterError(res.error.message || res.error || 'Failed to register spindle');
      setIsRegistering(false);
      return;
    }

    setIsRegistering(false);
    setIsRegisterOpen(false);
    if (onNotify) {
      onNotify(`Spindle ${res.data.serial_number} registered successfully into digital registry.`);
    }
    await loadSpindles();
  };

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
    return <TablePageSkeleton columns={['140px', '180px', '120px', '140px', '100px', '80px']} rows={6} />;
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
          onClick={handleOpenRegister}
          title={canRegister ? "Register New Manufactured Spindle" : "Registration restricted to Production, QA, Service, or Admin"}
          disabled={!canRegister}
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

            <CustomSelect 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ minWidth: '170px' }}
              options={[
                { value: 'all', label: 'All Spindle Types' },
                { value: 'motorized', label: 'Motorized Electro-Spindle' },
                { value: 'belt', label: 'Belt Driven' },
                { value: 'high frequency', label: 'High Frequency Direct' },
                { value: 'geared', label: 'High Torque Geared' },
                { value: 'grinding', label: 'Internal Grinding' }
              ]}
            />

            <CustomSelect 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '175px' }}
              options={[
                { value: 'all', label: 'All Operational Statuses' },
                { value: 'in production', label: 'In Production' },
                { value: 'qc pending', label: 'QC Pending' },
                { value: 'ready', label: 'Ready' },
                { value: 'dispatched', label: 'Dispatched / Field Active' },
                { value: 'under service', label: 'Under Service' }
              ]}
            />
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
        onClose={() => !isRegistering && setIsRegisterOpen(false)}
        title="Register New Manufactured Spindle Serial"
        footer={
          <>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsRegisterOpen(false)}
              disabled={isRegistering}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleRegisterSpindle}
              disabled={isRegistering || !canRegister || !formData.serialNumber.trim() || !formData.modelId}
            >
              {isRegistering ? (
                <>
                  <RefreshCw size={14} className="spin-icon" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Save to Registry</span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleRegisterSpindle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!canRegister && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={16} />
              <span>Permission Denied: Your current role ({userRole || 'VIEW_ONLY'}) cannot register spindles. Write authorization requires Production Manager (PROD_MGR), QA Manager, Service, or Administrator.</span>
            </div>
          )}

          {registerError && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{registerError}</span>
            </div>
          )}

          {isLoadingMeta ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="spin-icon" style={{ marginBottom: '8px', color: 'var(--primary)' }} />
              <div>Loading engineering models and customer directory...</div>
            </div>
          ) : (
            <>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Assigned Serial Number *</span>
                    {suggestedSerial && (
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                        onClick={() => setFormData(p => ({ ...p, serialNumber: suggestedSerial }))}
                      >
                        Reset to Suggested ({suggestedSerial})
                      </button>
                    )}
                  </label>
                  <input 
                    type="text" 
                    className="form-control mono" 
                    value={formData.serialNumber}
                    onChange={(e) => setFormData(p => ({ ...p, serialNumber: e.target.value.toUpperCase() }))}
                    placeholder="e.g. GPS-2026-0850"
                    required
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    PostgreSQL UNIQUE(serial_number) constraint guarantees authoritative duplicate prevention.
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Spindle Engineering Model *</label>
                  <CustomSelect 
                    value={formData.modelId}
                    onChange={(e) => setFormData(p => ({ ...p, modelId: e.target.value }))}
                    placeholder="-- Select Engineering Model --"
                    searchable={true}
                    required={true}
                    options={models.map(m => ({
                      value: m.id,
                      label: `${m.model_code} — ${m.model_name} (${m.max_rpm ? (m.max_rpm / 1000).toFixed(0) : '24'}k RPM, ${m.rated_power_kw} kW)`
                    }))}
                  />
                </div>

                {/* Technical Specifications preview card bound directly from spindle_models */}
                {(() => {
                  const selModel = models.find(m => m.id === formData.modelId);
                  if (!selModel) return null;
                  return (
                    <div style={{
                      gridColumn: 'span 2',
                      padding: '10px 12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '11px',
                      lineHeight: '1.5'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                        Live Model Technical Specifications (Auto-bound from Engineering Master):
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '4px 8px', color: 'var(--text-secondary)' }}>
                        <div><strong>Type:</strong> {selModel.spindle_type}</div>
                        <div><strong>Max RPM:</strong> {selModel.max_rpm?.toLocaleString()} RPM</div>
                        <div><strong>Power:</strong> {selModel.rated_power_kw} kW</div>
                        <div><strong>Torque:</strong> {selModel.nominal_torque_nm} Nm</div>
                        <div><strong>Taper:</strong> {selModel.taper_standard}</div>
                        <div><strong>Bearings:</strong> {selModel.bearing_type}</div>
                        <div><strong>Cooling:</strong> {selModel.cooling_type}</div>
                        <div><strong>Lubrication:</strong> {selModel.lubrication_type}</div>
                        <div><strong>Clamping Force:</strong> {selModel.clamping_retention_force_kn} kN</div>
                        <div><strong>Runout Standard:</strong> {selModel.runout_taper_microns} µm</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Commissioned Customer / Client</label>
                  <CustomSelect 
                    value={formData.customerId}
                    onChange={(e) => setFormData(p => ({ ...p, customerId: e.target.value }))}
                    placeholder="-- Internal Stock / Unallocated --"
                    searchable={true}
                    options={[
                      { value: '', label: '-- Internal Stock / Unallocated --' },
                      ...customers.map(c => ({
                        value: c.id,
                        label: `${c.company_name} (${c.customer_code})`
                      }))
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Warranty Period</label>
                  <CustomSelect 
                    value={formData.warrantyPeriod}
                    onChange={(e) => setFormData(p => ({ ...p, warrantyPeriod: e.target.value }))}
                    options={[
                      { value: 'Active (24 Months / 4,000h)', label: 'Active (24 Months / 4,000h)' },
                      { value: 'Active (12 Months / 2,500h)', label: 'Active (12 Months / 2,500h)' },
                      { value: 'Active (18 Months / 3,000h)', label: 'Active (18 Months / 3,000h)' },
                      { value: 'Active (36 Months / 6,000h)', label: 'Active (36 Months / 6,000h)' }
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Operational Status</label>
                  <CustomSelect 
                    value={formData.status}
                    onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                    options={[
                      { value: 'In Production', label: 'In Production' },
                      { value: 'Testing', label: 'Testing' },
                      { value: 'QC Pending', label: 'QC Pending' },
                      { value: 'QC Passed', label: 'QC Passed' },
                      { value: 'Ready', label: 'Ready' }
                    ]}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Manufacturing Plant / Facility</label>
                  <CustomSelect 
                    value={formData.currentLocation}
                    onChange={(e) => setFormData(p => ({ ...p, currentLocation: e.target.value }))}
                    options={[
                      { value: 'Pune Plant 1', label: 'Pune Plant 1 (Precision Spindle Works)' },
                      { value: 'Pune Plant 2', label: 'Pune Plant 2 (Heavy Machining)' },
                      { value: 'Bangalore Service Hub', label: 'Bangalore Service Hub' }
                    ]}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Production Batch & Engineering Notes</label>
                  <textarea 
                    className="form-control" 
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Optional work order reference, production batch, or client engineering specs..."
                  />
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
