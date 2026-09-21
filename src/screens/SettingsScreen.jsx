import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import Tabs from '../components/common/Tabs';
import CustomSelect from '../components/common/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/settings/settingsService';
import { 
  Building, Users, Bell, Wrench, Save, 
  Loader2, AlertCircle, RefreshCw, ShieldCheck, ShieldAlert 
} from 'lucide-react';

export default function SettingsScreen({ onNotify }) {
  const { role } = useAuth();
  const isManagement = role === 'ADMIN' || role === 'MANAGEMENT';

  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  // Live database state
  const [settings, setSettings] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [calibrationsList, setCalibrationsList] = useState([]);

  // Controlled form state
  const [formData, setFormData] = useState({
    name: '',
    facility: '',
    address: '',
    gstin: '',
    iso: '',
    shiftMode: 'Continuous 3-Shift 24x7 Operation',
    currency: 'INR (₹) • Metrology in Microns (µm)',
    alertPreferences: {
      bearingLowStock: true,
      noseTaperExceeded: true,
      serviceDelayed: true,
      customerPoApproval: true
    }
  });

  // Load all live settings from database
  const loadLiveSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [settingsRes, usersRes, calibrationsRes] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getAuthorizedUsers(),
        settingsService.getMachineCalibrations()
      ]);

      if (settingsRes.error) {
        throw new Error(settingsRes.error.message || 'Failed to load enterprise settings');
      }

      const s = settingsRes.data;
      setSettings(s);
      setFormData({
        name: s.name || '',
        facility: s.facility || '',
        address: s.address || '',
        gstin: s.gstin || '',
        iso: s.iso || '',
        shiftMode: s.shiftMode || 'Continuous 3-Shift 24x7 Operation',
        currency: 'INR (₹) • Metrology in Microns (µm)',
        alertPreferences: s.alertPreferences || {
          bearingLowStock: true,
          noseTaperExceeded: true,
          serviceDelayed: true,
          customerPoApproval: true
        }
      });

      if (!usersRes.error && usersRes.data) {
        setUsersList(usersRes.data);
      }

      if (!calibrationsRes.error && calibrationsRes.data) {
        setCalibrationsList(calibrationsRes.data);
      }
    } catch (err) {
      console.error('[GPS-ERP Settings] Load error:', err);
      setError(err.message || 'Failed to communicate with Supabase PostgreSQL');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveSettings();
  }, [loadLiveSettings]);

  // Handle field change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveSuccessMsg(null);
  };

  // Handle alert preference toggle
  const handlePreferenceToggle = (prefKey) => {
    if (!isManagement) return;
    setFormData(prev => ({
      ...prev,
      alertPreferences: {
        ...prev.alertPreferences,
        [prefKey]: !prev.alertPreferences[prefKey]
      }
    }));
    setSaveSuccessMsg(null);
  };

  // Save changes to database
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!isManagement) {
      if (onNotify) onNotify('Access restricted: Only Admin and Management accounts can save settings');
      return;
    }

    if (!settings || !settings.companyId) {
      if (onNotify) onNotify('Error: Authoritative enterprise record is not loaded');
      return;
    }

    // Form validation
    if (!formData.name.trim()) {
      if (onNotify) onNotify('Validation error: Corporate entity name is required');
      return;
    }
    if (!formData.facility.trim()) {
      if (onNotify) onNotify('Validation error: Manufacturing facility name is required');
      return;
    }
    if (!formData.address.trim()) {
      if (onNotify) onNotify('Validation error: Physical factory address is required');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const payload = {
        companyId: settings.companyId,
        branchId: settings.branchId,
        name: formData.name,
        facility: formData.facility,
        address: formData.address,
        gstin: formData.gstin,
        iso: formData.iso,
        shiftMode: formData.shiftMode,
        alertPreferences: formData.alertPreferences
      };

      const { data: updated, error: updError } = await settingsService.updateSettings(payload);

      if (updError) {
        throw new Error(updError.message || 'Database update failed');
      }

      setSettings(updated);
      setFormData(prev => ({
        ...prev,
        name: updated.name || prev.name,
        facility: updated.facility || prev.facility,
        address: updated.address || prev.address,
        gstin: updated.gstin || prev.gstin,
        iso: updated.iso || prev.iso,
        shiftMode: updated.shiftMode || prev.shiftMode,
        alertPreferences: updated.alertPreferences || prev.alertPreferences
      }));

      const msg = 'System preferences and plant configuration updated successfully';
      setSaveSuccessMsg(msg);
      if (onNotify) onNotify(msg);
    } catch (err) {
      console.error('[GPS-ERP Settings] Save error:', err);
      const errMsg = `Save failed: ${err.message}`;
      if (onNotify) onNotify(errMsg);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Render Loading State
  if (isLoading) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Industrial ERP Configuration & Settings" 
          subtitle="Manage company plant details, user role-based permissions, and machine calibrations"
        />
        <div className="section-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
            Loading live enterprise configuration from Supabase PostgreSQL...
          </p>
        </div>
      </div>
    );
  }

  // Render Database Error State with Retry
  if (error && !settings) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Industrial ERP Configuration & Settings" 
          subtitle="Manage company plant details, user role-based permissions, and machine calibrations"
        />
        <div className="section-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Database Connection Error</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
            {error}
          </p>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={loadLiveSettings}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
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
        title="Industrial ERP Configuration & Settings" 
        subtitle="Manage company plant details, user role-based permissions, and machine calibrations"
      >
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving || !isManagement}
          title={!isManagement ? "Only Admin or Management can edit settings" : "Save Changes to Database"}
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </PageHeader>

      {/* Role Access / Save Notice */}
      {!isManagement && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '13px'
        }}>
          <ShieldAlert size={16} color="#dc2626" />
          <span>
            <strong>Read-Only Mode:</strong> Your assigned role (<strong>{role || 'Operational'}</strong>) does not have authorization to modify enterprise settings. System configuration is managed by Admin & Executive Management.
          </span>
        </div>
      )}

      {saveSuccessMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          color: '#166534',
          fontSize: '13px'
        }}>
          <ShieldCheck size={16} color="#16a34a" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <Tabs 
        tabs={[
          { id: 'profile', label: 'Company Profile & Facility' },
          { id: 'users', label: 'Authorized Users & Roles' },
          { id: 'calibration', label: 'Machine Bay Calibration Cycles' },
          { id: 'notifications', label: 'Alert & Shift Preferences' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Company Profile */}
      {activeTab === 'profile' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Building size={16} color="#7A1F3D" />
              <span>Enterprise Identity & Legal Registration</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Source: <strong className="mono" style={{ color: 'var(--primary)' }}>public.companies & public.branches</strong>
            </span>
          </div>
          <form onSubmit={handleSave} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', marginBottom: '20px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                <img src="/logo.jpg" alt="General Precision Spindles" style={{ height: '44px', display: 'block', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>General Precision Spindles Emblem & Logo</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Official brand emblem active across navigation shell, invoices, metrology reports, and shop floor documentation.</div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Corporate Entity Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isManagement || isSaving}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Manufacturing Facility</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.facility}
                  onChange={(e) => handleInputChange('facility', e.target.value)}
                  disabled={!isManagement || isSaving}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Factory Physical Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={!isManagement || isSaving}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN Identification Number</label>
                <input 
                  type="text" 
                  className="form-control mono" 
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  disabled={!isManagement || isSaving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quality Standards Certification</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.iso}
                  onChange={(e) => handleInputChange('iso', e.target.value)}
                  disabled={!isManagement || isSaving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Operating Shift Mode</label>
                <CustomSelect 
                  value={formData.shiftMode}
                  onChange={(e) => handleInputChange('shiftMode', e.target.value)}
                  disabled={!isManagement || isSaving}
                  options={[
                    { value: 'Continuous 3-Shift 24x7 Operation', label: 'Continuous 3-Shift 24x7 Operation' },
                    { value: 'Shift A (07:00 - 15:30) & Shift B (15:30 - 00:00)', label: 'Shift A (07:00 - 15:30) & Shift B (15:30 - 00:00)' },
                    { value: 'Single General Shift', label: 'Single General Shift' }
                  ]}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Currency & Precision</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.currency} 
                  disabled 
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Users & Roles */}
      {activeTab === 'users' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Users size={16} color="#7A1F3D" />
              <span>Plant Operators & Role Access Control</span>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={() => {
                if (onNotify) onNotify(isManagement ? 'New workforce invite generator active' : 'Only administrators can invite users');
              }}
            >
              + Add User
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Department / Bay</th>
                  <th>Assigned Role</th>
                  <th>Permission Level</th>
                  <th>System Access</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length > 0 ? (
                  usersList.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600 }}>{user.name}</td>
                      <td style={{ fontSize: '12px' }}>{user.dept}</td>
                      <td style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>{user.role}</td>
                      <td style={{ fontSize: '12px' }}>{user.access}</td>
                      <td className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.systemAccess}</td>
                      <td>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          background: user.status === 'Active' ? '#ecfdf5' : '#fef2f2',
                          color: user.status === 'Active' ? '#047857' : '#b91c1c'
                        }}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No user records found in database
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Calibration */}
      {activeTab === 'calibration' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Wrench size={16} color="#7A1F3D" />
              <span>Machine Tool & Air Gauge Master Calibration Log</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Source: <strong className="mono" style={{ color: 'var(--primary)' }}>public.machines & public.production_bays</strong>
            </span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipment Asset</th>
                  <th>Station Cell</th>
                  <th>Master Calibrated Standard</th>
                  <th>Last Calibrated</th>
                  <th>Next Due</th>
                  <th>Calibration Agency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {calibrationsList.length > 0 ? (
                  calibrationsList.map((cal) => (
                    <tr key={cal.id}>
                      <td style={{ fontWeight: 600 }}>{cal.asset}</td>
                      <td style={{ fontSize: '12px' }}>{cal.station}</td>
                      <td className="mono" style={{ fontSize: '12px' }}>{cal.standard}</td>
                      <td className="mono" style={{ fontSize: '12px' }}>{cal.last}</td>
                      <td className="mono" style={{ fontSize: '12px', color: 'var(--primary)' }}>{cal.next}</td>
                      <td style={{ fontSize: '12px' }}>{cal.agency}</td>
                      <td>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          background: cal.status === 'Valid' ? '#ecfdf5' : '#fffbeb',
                          color: cal.status === 'Valid' ? '#047857' : '#b45309'
                        }}>
                          {cal.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No machine calibration records found in database
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Bell size={16} color="#7A1F3D" />
              <span>Plant Floor Alert Triggers</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Realtime Notification Thresholds
            </span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { 
                key: 'bearingLowStock',
                title: "Ceramic Bearings Low Stock Reorder Threshold", 
                desc: "Trigger automated procurement alert when stock drops below 10 pairs." 
              },
              { 
                key: 'noseTaperExceeded',
                title: "Nose Taper Runout Tolerance Exceeded (> 1.0 µm)", 
                desc: "Halt machine traveler and notify QA lead immediately upon dial test indicator alert." 
              },
              { 
                key: 'serviceDelayed',
                title: "Service Turnaround Exceeding 5 Days", 
                desc: "Flag delayed service rebuilding jobs to Plant Production Manager." 
              },
              { 
                key: 'customerPoApproval',
                title: "Customer PO Approval Notification", 
                desc: "Notify sales desk and auto-reserve allocated Bill of Materials in stores." 
              },
            ].map((pref) => (
              <div 
                key={pref.key} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 16px', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--bg-surface-subtle)',
                  opacity: isManagement ? 1 : 0.8
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{pref.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{pref.desc}</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={!!formData.alertPreferences?.[pref.key]} 
                  onChange={() => handlePreferenceToggle(pref.key)}
                  disabled={!isManagement || isSaving}
                  style={{ width: '18px', height: '18px', cursor: isManagement ? 'pointer' : 'not-allowed' }} 
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
